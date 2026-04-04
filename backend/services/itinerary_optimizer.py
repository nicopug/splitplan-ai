"""
SplitPlan AI — Itinerary Optimizer
====================================
Validates and fixes AI-generated itineraries using Google OR-Tools CP-SAT.

Architecture
------------
  Gemini  →  raw itinerary JSON (desired activities, estimated times)
  Optimizer →  mathematically feasible schedule (adjusted start/end times)
  FastAPI  →  saves optimizer output to DB

Model
-----
- One CP-SAT model per day (avoids domain explosion for multi-day trips).
- Each activity gets a BoolVar `performed[i]` (anchor activities forced to 1).
- Soft activities use `NewOptionalIntervalVar` — the solver can skip them.
- Sequencing constraint: if item i and i+1 are both performed,
  start[i+1] >= end[i] + travel_time(i → i+1).
- Objective: maximize total `performed` (minimize dropped items).
- Hard timeout: 3 s per day (well within Vercel serverless limits).
- Runs in a thread pool via `run_in_executor` to avoid blocking FastAPI's
  async event loop.
"""

import asyncio
import logging
from collections import defaultdict
from math import atan2, cos, radians, sin, sqrt
from typing import Optional

from ortools.sat.python import cp_model

from services.maps_service import get_travel_time_matrix

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────
URBAN_SPEED_KMH = 30          # average urban movement speed
MIN_TRAVEL_MINUTES = 5        # floor: no activity is "instant to reach"
DEFAULT_TRAVEL_MINUTES = 10   # used when coordinates are unavailable (0,0)
SOLVER_TIMEOUT_SECONDS = 3.0  # hard per-day timeout
DAY_START_MINUTE = 360        # 06:00 — earliest any activity can start
DAY_END_MINUTE = 1380         # 23:00 — latest any activity can end

# Default durations when Gemini doesn't provide explicit end_time
_DEFAULT_DURATION: dict[str, int] = {
    "FOOD": 60,
    "TRANSPORT": 60,
    "ACTIVITY": 90,
    "CHECKIN": 30,
}

# Activity types treated as hard anchors (cannot be moved)
_ANCHOR_TYPES = {"TRANSPORT", "CHECKIN"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _haversine_minutes(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    Estimates travel time in minutes between two GPS coordinates.
    Uses Haversine formula + constant urban speed (30 km/h).
    Returns DEFAULT_TRAVEL_MINUTES if coordinates are missing or identical.
    """
    if not (lat1 and lon1 and lat2 and lon2):
        return DEFAULT_TRAVEL_MINUTES
    if abs(lat1 - lat2) < 1e-6 and abs(lon1 - lon2) < 1e-6:
        return MIN_TRAVEL_MINUTES

    R = 6371.0  # Earth radius in km
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    dist_km = 2 * R * atan2(sqrt(a), sqrt(1 - a))
    return max(MIN_TRAVEL_MINUTES, int(dist_km / URBAN_SPEED_KMH * 60))


def _parse_minute(iso_str: str) -> int | None:
    """Converts 'YYYY-MM-DDTHH:MM:SS' → minutes since midnight. Returns None on failure."""
    if not iso_str:
        return None
    try:
        time_part = iso_str[11:16]  # "HH:MM" slice — avoids dateutil dependency
        h, m = int(time_part[:2]), int(time_part[3:5])
        return h * 60 + m
    except Exception:
        return None


def _duration_minutes(activity: dict) -> int:
    """
    Returns activity duration in minutes.
    Priority: (end_time - start_time) from Gemini → type default.
    """
    start = _parse_minute(activity.get("start_time", ""))
    end = _parse_minute(activity.get("end_time", ""))
    if start is not None and end is not None and end > start:
        return end - start
    return _DEFAULT_DURATION.get(activity.get("type", "ACTIVITY"), 60)


def _is_anchor(activity: dict) -> bool:
    """Returns True if this activity is a hard time constraint."""
    return activity.get("type") in _ANCHOR_TYPES or bool(activity.get("is_anchor"))


def _minute_to_iso(date_str: str, minute: int) -> str:
    """
    Builds an ISO datetime string from a date string and a minute-since-midnight value.
    Clamps to [0, 1439] to prevent midnight overflow.
    """
    minute = max(0, min(minute, 1439))
    h, m = divmod(minute, 60)
    return f"{date_str}T{h:02d}:{m:02d}:00"


# ── Core CP-SAT model (one day) ───────────────────────────────────────────────

def _optimize_single_day(
    date_str: str,
    indexed_activities: list[tuple[int, dict]],
    travel_matrix: Optional[dict[tuple[int, int], int]] = None,
) -> dict:
    """
    Builds and solves a CP-SAT model for a single day's activities.

    Args:
        date_str: "YYYY-MM-DD"
        indexed_activities: list of (original_index, activity_dict) pairs

    Returns:
        {"schedule": [...], "dropped": [...]}
    """
    model = cp_model.CpModel()
    n = len(indexed_activities)

    if n == 0:
        return {"schedule": [], "dropped": []}

    # ── Build metadata ────────────────────────────────────────────────────────
    meta = []
    for orig_idx, act in indexed_activities:
        is_anc = _is_anchor(act)
        anchor_min = _parse_minute(act.get("start_time", "")) if is_anc else None
        meta.append({
            "orig_index": orig_idx,
            "title": act.get("title", f"Activity {orig_idx}"),
            "type": act.get("type", "ACTIVITY"),
            "duration": max(1, _duration_minutes(act)),
            "is_anchor": is_anc,
            "anchor_min": anchor_min,
            "lat": float(act.get("lat") or 0.0),
            "lon": float(act.get("lon") or 0.0),
            "original": act,
        })

    # ── Decision variables ────────────────────────────────────────────────────
    starts = []       # IntVar: start time in minutes since midnight
    ends_list = []    # IntVar: end time (= start + duration)
    performed = []    # BoolVar: is this activity included in the schedule?

    for m in meta:
        dur = m["duration"]
        p = model.NewBoolVar(f"p_{m['orig_index']}")

        if m["is_anchor"] and m["anchor_min"] is not None:
            # Fixed-domain IntVar — the solver cannot move this activity
            anc = m["anchor_min"]
            s = model.NewIntVar(anc, anc, f"s_{m['orig_index']}")
            model.Add(p == 1)  # anchors are always performed
        else:
            s = model.NewIntVar(DAY_START_MINUTE, DAY_END_MINUTE, f"s_{m['orig_index']}")
            # Enforce day bounds only when activity is performed
            model.Add(s >= DAY_START_MINUTE).OnlyEnforceIf(p)
            model.Add(s + dur <= DAY_END_MINUTE).OnlyEnforceIf(p)

        e = model.NewIntVar(DAY_START_MINUTE, DAY_END_MINUTE + 120, f"e_{m['orig_index']}")
        model.NewOptionalIntervalVar(s, dur, e, p, f"iv_{m['orig_index']}")

        starts.append(s)
        ends_list.append(e)
        performed.append(p)

    # ── Sequencing constraints ─────────────────────────────────────────────────
    for i in range(n - 1):
        # Use OSRM real-world time when available; fall back to Haversine
        osrm_time = (
            travel_matrix.get((meta[i]["orig_index"], meta[i + 1]["orig_index"]))
            if travel_matrix is not None
            else None
        )
        travel = osrm_time if osrm_time is not None else _haversine_minutes(
            meta[i]["lat"], meta[i]["lon"],
            meta[i + 1]["lat"], meta[i + 1]["lon"],
        )
        # If both item i and item i+1 are performed:
        #   start[i+1] >= end[i] + travel_time(i → i+1)
        model.Add(
            starts[i + 1] >= ends_list[i] + travel
        ).OnlyEnforceIf([performed[i], performed[i + 1]])

        # Preserve Gemini's chronological ordering for soft items
        if not meta[i]["is_anchor"] and not meta[i + 1]["is_anchor"]:
            model.Add(
                starts[i] <= starts[i + 1]
            ).OnlyEnforceIf([performed[i], performed[i + 1]])

    # ── Objective: keep as many activities as possible ────────────────────────
    model.Maximize(sum(performed))

    # ── Solve ─────────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = SOLVER_TIMEOUT_SECONDS
    status = solver.Solve(model)

    schedule = []
    dropped = []

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for i, m in enumerate(meta):
            if solver.Value(performed[i]):
                start_min = solver.Value(starts[i])
                end_min = start_min + m["duration"]
                orig = m["original"]
                schedule.append({
                    # Preserve all original Gemini fields (title, description, type, lat, lon …)
                    **{k: v for k, v in orig.items() if k not in ("start_time", "end_time")},
                    "start_time": _minute_to_iso(date_str, start_min),
                    "end_time": _minute_to_iso(date_str, end_min),
                    "_optimizer_adjusted": not m["is_anchor"],
                    "_orig_index": m["orig_index"],
                })
            else:
                dropped.append({
                    "orig_index": m["orig_index"],
                    "title": m["title"],
                    "type": m["type"],
                })
    else:
        # Solver could not find any solution (rare: anchor conflict)
        logger.warning(f"[Optimizer] CP-SAT returned {solver.StatusName(status)} for {date_str}")
        dropped = [
            {"orig_index": m["orig_index"], "title": m["title"], "type": m["type"]}
            for m in meta
        ]

    return {"schedule": schedule, "dropped": dropped}


# ── Multi-day orchestrator ─────────────────────────────────────────────────────

def optimize_itinerary_sync(
    activities: list[dict],
    travel_matrix: Optional[dict[tuple[int, int], int]] = None,
) -> dict:
    """
    Groups activities by day and runs CP-SAT independently per day.

    Args:
        activities: list of activity dicts from Gemini (with start_time ISO strings)

    Returns:
        {
            "feasible": bool,   — True if every activity fits
            "partial": bool,    — True if some (not all) fit
            "schedule": [...],  — activities with optimizer-corrected times
            "dropped": [...],   — activities that could not fit
        }
    """
    # Group by date string "YYYY-MM-DD"
    days: dict[str, list[tuple[int, dict]]] = defaultdict(list)
    for orig_idx, act in enumerate(activities):
        iso = act.get("start_time", "")
        date_str = iso[:10] if len(iso) >= 10 else "unknown"
        days[date_str].append((orig_idx, act))

    all_schedule: list[dict] = []
    all_dropped: list[dict] = []

    for date_str in sorted(days.keys()):
        logger.info(f"[Optimizer] Solving day {date_str} ({len(days[date_str])} activities)")
        result = _optimize_single_day(date_str, days[date_str], travel_matrix)
        all_schedule.extend(result["schedule"])
        all_dropped.extend(result["dropped"])

    # Sort final schedule by start_time to restore chronological order
    all_schedule.sort(key=lambda x: x.get("start_time", ""))

    return {
        "feasible": len(all_dropped) == 0,
        "partial": 0 < len(all_dropped) < len(activities),
        "schedule": all_schedule,
        "dropped": all_dropped,
    }


# ── Async public API ───────────────────────────────────────────────────────────

async def optimize_travel_itinerary(activities: list[dict]) -> dict:
    """
    Async entry point for FastAPI endpoints.

    Flow:
      1. Fetch OSRM travel time matrix (async, in event loop, with fallback).
      2. Run CP-SAT solver in a thread pool (sync C++ code must not block loop).

    Args:
        activities: list of activity dicts (Gemini output) with ISO start_time

    Returns:
        Optimizer result dict (see optimize_itinerary_sync docstring)
    """
    if not activities:
        return {"feasible": True, "partial": False, "schedule": [], "dropped": []}

    # Step 1: fetch OSRM matrix while still in the async event loop
    locations = [
        (float(a.get("lat") or 0.0), float(a.get("lon") or 0.0))
        for a in activities
    ]
    travel_matrix = await get_travel_time_matrix(locations, profile="foot")
    # travel_matrix is None on any OSRM failure — solver falls back to Haversine

    # Step 2: run synchronous CP-SAT solver in thread pool
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, optimize_itinerary_sync, activities, travel_matrix
    )

    source = "OSRM" if travel_matrix is not None else "Haversine"
    logger.info(
        f"[Optimizer] Result: feasible={result['feasible']}, "
        f"scheduled={len(result['schedule'])}, dropped={len(result['dropped'])}, "
        f"travel_times={source}"
    )
    return result
