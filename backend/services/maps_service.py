"""
SplitPlan AI — Maps Service
============================
Fetches real-world travel time matrices from the OSRM public routing engine.

OSRM Table API
--------------
Endpoint: https://router.project-osrm.org/table/v1/{profile}/{coords}
  - coords:   semicolon-separated "lon,lat" pairs  (OSRM is lon-first)
  - profile:  "foot" | "driving" | "cycling"
  - response: {"code": "Ok", "durations": [[sec, ...], ...]}
  - durations[i][j] = travel time in seconds from location i to location j
                      (null if the pair is unreachable)

Caching
-------
In-memory dict keyed by (rounded coordinates + profile).
Coordinates are rounded to 4 decimal places (~11 m precision) for hit rate.
Cache is process-local (reset on Vercel cold start) — good enough for
single-request reuse without Redis overhead.

Fallback
--------
Returns None on timeout, HTTP error, or any unexpected exception.
Callers MUST fall back to Haversine when None is returned.
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────────
OSRM_BASE_URL = "https://router.project-osrm.org/table/v1"
OSRM_TIMEOUT_SECONDS = 2.5
MAX_OSRM_LOCATIONS = 25   # guard against URL length limit (~2 KB)

# ── In-memory cache ────────────────────────────────────────────────────────────
# {cache_key_str: {(i, j): minutes}}
_matrix_cache: dict[str, dict[tuple[int, int], int]] = {}


def _cache_key(locations: list[tuple[float, float]], profile: str) -> str:
    """Stable cache key from rounded (lat, lon) pairs + profile."""
    rounded = tuple((round(lat, 4), round(lon, 4)) for lat, lon in locations)
    return f"{profile}:{rounded}"


async def get_travel_time_matrix(
    locations: list[tuple[float, float]],
    profile: str = "foot",
) -> Optional[dict[tuple[int, int], int]]:
    """
    Fetches a travel time matrix from OSRM for all (i, j) location pairs.

    Args:
        locations:  List of (lat, lon) tuples in activity order.
                    OSRM requires lon,lat — the conversion is done internally.
        profile:    Routing profile: "foot" (default), "driving", "cycling".

    Returns:
        dict mapping (i, j) → travel_minutes for reachable pairs.
        Returns None on any failure — caller should fall back to Haversine.

    Example log on success:
        [OSRM] Matrix fetched OK | profile=foot | locations=8 | pairs=56 | cache=MISS
    """
    n = len(locations)

    if n < 2:
        return {}

    if n > MAX_OSRM_LOCATIONS:
        logger.warning(
            f"[OSRM] {n} locations exceeds MAX_OSRM_LOCATIONS={MAX_OSRM_LOCATIONS} "
            f"— skipping OSRM, using Haversine fallback"
        )
        return None

    # Filter out (0, 0) entries — ocean coordinates break OSRM routing
    valid_mask = [
        bool(lat and lon and not (abs(lat) < 1e-4 and abs(lon) < 1e-4))
        for lat, lon in locations
    ]
    if not any(valid_mask):
        logger.warning("[OSRM] All locations have zero coordinates — using Haversine fallback")
        return None

    key = _cache_key(locations, profile)
    if key in _matrix_cache:
        logger.debug(
            f"[OSRM] Cache HIT | profile={profile} | locations={n}"
        )
        return _matrix_cache[key]

    # OSRM expects "lon,lat" (longitude first)
    coord_str = ";".join(
        f"{lon:.6f},{lat:.6f}" for lat, lon in locations
    )
    url = f"{OSRM_BASE_URL}/{profile}/{coord_str}?annotations=duration"

    try:
        async with httpx.AsyncClient(timeout=OSRM_TIMEOUT_SECONDS) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") != "Ok":
            logger.warning(
                f"[OSRM] Non-OK response code='{data.get('code')}' "
                f"— using Haversine fallback"
            )
            return None

        raw_durations: list[list] = data["durations"]
        matrix: dict[tuple[int, int], int] = {}

        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                seconds = raw_durations[i][j]
                if seconds is None:
                    # Unreachable pair (e.g., island without ferry routing)
                    continue
                matrix[(i, j)] = max(1, int(seconds / 60))  # seconds → minutes

        _matrix_cache[key] = matrix

        logger.info(
            f"[OSRM] Matrix fetched OK | profile={profile} | "
            f"locations={n} | pairs={len(matrix)} | cache=MISS"
        )
        return matrix

    except httpx.TimeoutException:
        logger.warning(
            f"[OSRM] Timeout after {OSRM_TIMEOUT_SECONDS}s "
            f"— using Haversine fallback"
        )
        return None
    except httpx.HTTPStatusError as e:
        logger.warning(
            f"[OSRM] HTTP {e.response.status_code} — using Haversine fallback"
        )
        return None
    except Exception as e:
        logger.warning(f"[OSRM] Unexpected error: {e} — using Haversine fallback")
        return None
