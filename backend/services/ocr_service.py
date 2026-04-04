"""
SplitPlan AI — OCR Service
===========================
Estrae dati strutturati da ricevute (immagini e PDF) tramite Gemini Vision.

Tipi MIME supportati
--------------------
Immagini : image/jpeg, image/png, image/webp, image/heic, image/heif
PDF      : application/pdf

Gemini riceve il file grezzo (bytes) + il prompt e risponde direttamente
in JSON grazie a response_mime_type="application/json" — nessun post-parsing
fragile su testo libero.

Ritorna
-------
dict  → {"total_amount", "currency", "date", "merchant_name", "category"}
None  → estrazione fallita (foto mossa, ricevuta illeggibile, errore rete)

Errori fatali (tipo MIME non supportato) vengono sollevati come ValueError
così l'endpoint può restituire un 422 chiaro al frontend.
"""

import json
import logging
import os
from typing import Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)

_AI_MODEL = "gemini-2.5-flash"

SUPPORTED_MIME_TYPES: frozenset[str] = frozenset({
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
})

# ── Prompt ────────────────────────────────────────────────────────────────────
# Istruzioni in italiano per allinearsi alla lingua dell'app.
# Il formato JSON è imposto anche lato SDK (response_mime_type) per massima
# affidabilità — il prompt lo ribadisce per ridurre allucinazioni nei campi.
_RECEIPT_PROMPT = """
Analizza questa ricevuta/scontrino di viaggio e restituisci SOLO un oggetto JSON valido
con i seguenti campi:

{
  "total_amount": <float — importo totale pagato, senza simbolo valuta, es. 24.50>,
  "currency":     <string — codice ISO 4217 a 3 lettere, es. "EUR", "USD", "GBP">,
  "date":         <string — data in formato YYYY-MM-DD, oppure null se non leggibile>,
  "merchant_name":<string — nome del negozio/ristorante/servizio, oppure null>,
  "category":     <string — DEVE essere esattamente una tra: "FOOD", "TRANSPORT", "ACCOMMODATION", "OTHER">
}

Regole di classificazione categoria:
- FOOD          → ristoranti, bar, caffè, supermercati, mense
- TRANSPORT     → taxi, Uber, treni, aerei, autobus, noleggio auto, pedaggi
- ACCOMMODATION → hotel, B&B, Airbnb, ostelli, appartamenti vacanza
- OTHER         → tutto il resto (shopping, farmacia, intrattenimento, ecc.)

Regole generali:
- Se l'importo totale non è leggibile o ambiguo → "total_amount": null
- Se la valuta non è riconoscibile → usa "EUR" come default
- Rispondi SOLO con il JSON grezzo, senza markdown, senza testo aggiuntivo.
""".strip()

# ── Singleton client ───────────────────────────────────────────────────────────
_client: Optional[genai.Client] = None


def _get_client() -> Optional[genai.Client]:
    global _client
    if _client is not None:
        return _client
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.error("[OCR] GOOGLE_API_KEY non configurata — OCR non disponibile")
        return None
    _client = genai.Client(api_key=api_key)
    return _client


# ── Public API ─────────────────────────────────────────────────────────────────

async def process_receipt_image(
    file_content: bytes,
    mime_type: str,
) -> Optional[dict]:
    """
    Invia una ricevuta a Gemini Vision e restituisce i campi estratti.

    Args:
        file_content:  Byte grezzi del file caricato.
        mime_type:     MIME type (es. "image/jpeg", "application/pdf").

    Returns:
        dict con chiavi:
            total_amount  (float | None)
            currency      (str, codice ISO)
            date          (str YYYY-MM-DD | None)
            merchant_name (str | None)
            category      (str: FOOD | TRANSPORT | ACCOMMODATION | OTHER)
        Oppure None se l'estrazione non è affidabile.

    Raises:
        ValueError: se il tipo MIME non è supportato — il caller deve restituire 422.
    """
    if mime_type not in SUPPORTED_MIME_TYPES:
        raise ValueError(
            f"Tipo file non supportato: '{mime_type}'. "
            f"Carica un'immagine (JPEG, PNG, WEBP, HEIC, HEIF) o un PDF."
        )

    client = _get_client()
    if not client:
        return None

    size_kb = len(file_content) / 1024
    logger.info(
        f"[OCR] Invio ricevuta a Gemini | mime={mime_type} | size={size_kb:.1f} KB"
    )

    try:
        response = await client.aio.models.generate_content(
            model=_AI_MODEL,
            contents=[
                _RECEIPT_PROMPT,
                types.Part.from_bytes(data=file_content, mime_type=mime_type),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        raw: str = response.text or ""

        # ── Token usage log ───────────────────────────────────────────────────
        meta = getattr(response, "usage_metadata", None)
        in_tok = getattr(meta, "prompt_token_count", "?")
        out_tok = getattr(meta, "candidates_token_count", "?")
        logger.info(
            f"[OCR] Gemini risposta ricevuta | "
            f"input_tokens={in_tok} | output_tokens={out_tok}"
        )

        data: dict = json.loads(raw)

    except json.JSONDecodeError as e:
        logger.error(
            f"[OCR] Gemini ha restituito JSON non valido: {e} | "
            f"raw='{raw[:300]}'"
        )
        return None
    except Exception as e:
        logger.error(f"[OCR] Errore imprevisto durante l'estrazione: {e}")
        return None

    # ── Sanitizzazione campi ──────────────────────────────────────────────────
    total_amount: Optional[float] = None
    raw_amount = data.get("total_amount")
    if raw_amount is not None:
        try:
            total_amount = round(float(raw_amount), 2)
        except (TypeError, ValueError):
            logger.warning(f"[OCR] total_amount non convertibile: '{raw_amount}'")

    currency = (data.get("currency") or "EUR").upper().strip()
    if len(currency) != 3 or not currency.isalpha():
        logger.warning(f"[OCR] Valuta non valida '{currency}' → fallback EUR")
        currency = "EUR"

    category = (data.get("category") or "OTHER").upper().strip()
    if category not in {"FOOD", "TRANSPORT", "ACCOMMODATION", "OTHER"}:
        logger.warning(f"[OCR] Categoria non riconosciuta '{category}' → OTHER")
        category = "OTHER"

    result = {
        "total_amount": total_amount,
        "currency": currency,
        "date": data.get("date"),
        "merchant_name": data.get("merchant_name"),
        "category": category,
    }

    logger.info(
        f"[OCR] Estrazione OK | merchant='{result['merchant_name']}' | "
        f"amount={result['total_amount']} {result['currency']} | "
        f"category={result['category']}"
    )
    return result
