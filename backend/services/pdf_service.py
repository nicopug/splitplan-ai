"""
SplitPlan AI — PDF Service
===========================
Genera la "Nota Spese Ufficiale" in formato PDF per uso amministrativo / B2B.

Layout
------
  [Header] SPLITPLAN AI · NOTA SPESE UFFICIALE
  [1] Dati Dipendente / Richiedente
  [2] Dettagli Trasferta
  [3] Tabella Spese  →  Data | Fornitore | Categoria | Importo (EUR)
  [4] Analisi Previsionale AI  (opzionale — se forecast_data è fornito)
  [5] Blocco firme

Caratteri speciali
------------------
fpdf2 con font Helvetica (CP1252) non supporta il simbolo "€".
Tutta la valuta è resa come "EUR" per evitare encoding errors senza
dover imbedare font TrueType aggiuntivi.
"""

import io
from datetime import datetime
from typing import Optional

from fpdf import FPDF


# ── Palette ───────────────────────────────────────────────────────────────────
_NAVY    = (18,  24,  48)
_LIGHT   = (245, 247, 252)
_BLUE    = (0,   100, 220)
_GREEN   = (0,   160,  80)
_AMBER   = (200, 130,   0)
_RED     = (200,   0,   0)
_GREY    = (100, 100, 100)
_WHITE   = (255, 255, 255)

_STATUS_COLOR = {
    "ON_TRACK": _GREEN,
    "WARNING":  _AMBER,
    "CRITICAL": _RED,
}
_STATUS_LABEL = {
    "ON_TRACK": "NEL BUDGET",
    "WARNING":  "ATTENZIONE",
    "CRITICAL": "CRITICO",
}


def _clean(text) -> str:
    """Strip characters outside CP1252 — avoids fpdf2 UnicodeEncodeError."""
    return (
        str(text)
        .replace("\u20ac", "EUR ")   # €
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u2026", "...")
    )


def _fmt_date(d_str) -> str:
    if not d_str:
        return "-"
    try:
        s = str(d_str)
        if "T" in s:
            dt = datetime.fromisoformat(s.replace("Z", ""))
        else:
            dt = datetime.strptime(s[:10], "%Y-%m-%d")
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(d_str)[:10]


class _NotaSpesePDF(FPDF):
    """FPDF subclass with branded header and page-number footer."""

    def header(self):
        self.set_fill_color(*_NAVY)
        self.rect(0, 0, 210, 26, "F")
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(*_WHITE)
        self.set_y(5)
        self.cell(0, 8, "SPLITPLAN AI", align="C", ln=True)
        self.set_font("Helvetica", "", 7)
        self.cell(0, 5, "NOTA SPESE UFFICIALE", align="C", ln=True)
        self.ln(6)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*_GREY)
        now = datetime.now().strftime("%d/%m/%Y %H:%M")
        self.cell(
            0, 5,
            f"SplitPlan AI - Generato il {now} - Pag. {self.page_no()}",
            align="C",
        )


def _section(pdf: _NotaSpesePDF, title: str):
    pdf.ln(4)
    pdf.set_fill_color(*_LIGHT)
    pdf.set_text_color(*_NAVY)
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 9, f"  {title.upper()}", fill=True, ln=True)
    pdf.ln(1)


def _kv(pdf: _NotaSpesePDF, label: str, value, bold_value: bool = False):
    pdf.set_text_color(*_GREY)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(52, 7, _clean(label) + ":", ln=False)
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("Helvetica", "B" if bold_value else "", 9)
    pdf.multi_cell(0, 7, _clean(str(value) if value else "-"))


# ── Public API ────────────────────────────────────────────────────────────────

def generate_nota_spese(
    trip,
    account,
    company,
    expenses: list,
    forecast_data: Optional[dict] = None,
) -> bytes:
    """
    Genera la Nota Spese Ufficiale in PDF.

    Args:
        trip:          ORM Trip object.
        account:       ORM Account object (dipendente richiedente).
        company:       ORM Company object o None.
        expenses:      Lista di ORM Expense objects ordinata per data.
        forecast_data: Dict con campi AI (budget_status, projected_total,
                        savings_advice, confidence_score) — opzionale.

    Returns:
        Bytes raw del PDF, pronti per StreamingResponse.
    """
    pdf = _NotaSpesePDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # ── 1. Dipendente ─────────────────────────────────────────────────────────
    _section(pdf, "Dati Dipendente / Richiedente")
    _kv(pdf, "Nome e Cognome", f"{account.name} {account.surname}", bold_value=True)
    _kv(pdf, "Email", account.email)
    if company:
        _kv(pdf, "Azienda", company.name)
        if company.max_budget_per_trip:
            _kv(pdf, "Budget Policy", f"Max EUR {company.max_budget_per_trip:.2f} per trasferta")

    # ── 2. Viaggio ────────────────────────────────────────────────────────────
    _section(pdf, "Dettagli Trasferta")
    destination = getattr(trip, "real_destination", None) or trip.destination or "-"
    _kv(pdf, "Destinazione", destination, bold_value=True)
    _kv(pdf, "Periodo", f"{_fmt_date(trip.start_date)} - {_fmt_date(trip.end_date)}")
    if trip.accommodation:
        _kv(pdf, "Struttura", trip.accommodation)
    budget_ref = (trip.budget_max or 0) or (trip.budget or 0)
    if budget_ref:
        _kv(pdf, "Budget Autorizzato", f"EUR {budget_ref:.2f}")
    _kv(pdf, "Stato Approvazione", trip.status.replace("_", " "))

    # ── 3. Tabella spese ──────────────────────────────────────────────────────
    _section(pdf, "Riepilogo Spese")

    if not expenses:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*_GREY)
        pdf.cell(0, 8, "  Nessuna spesa registrata.", ln=True)
    else:
        # Header row
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*_WHITE)
        pdf.set_fill_color(*_NAVY)
        pdf.cell(26, 8, "  DATA",               fill=True)
        pdf.cell(74, 8, "  FORNITORE / DESCR.",  fill=True)
        pdf.cell(36, 8, "  CATEGORIA",           fill=True)
        pdf.cell(0,  8, "  IMPORTO (EUR)",        fill=True, ln=True)

        # Rows
        pdf.set_font("Helvetica", "", 8)
        odd   = True
        total = 0.0

        sorted_exp = sorted(expenses, key=lambda e: (e.date or ""))
        for exp in sorted_exp:
            if pdf.get_y() > 255:
                pdf.add_page()

            pdf.set_fill_color(248, 250, 254) if odd else pdf.set_fill_color(255, 255, 255)
            pdf.set_text_color(40, 40, 40)

            date_str = _fmt_date(exp.date)
            desc     = _clean(exp.description or "-")[:44]
            cat      = _clean(exp.category or "-")[:20]
            amt      = exp.amount or 0.0
            total   += amt

            pdf.cell(26, 7, f"  {date_str}", fill=True)
            pdf.cell(74, 7, f"  {desc}",     fill=True)
            pdf.cell(36, 7, f"  {cat}",      fill=True)
            pdf.cell(0,  7, f"  {amt:.2f}",  fill=True, ln=True)
            odd = not odd

        # Total row
        pdf.ln(1)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_fill_color(*_LIGHT)
        pdf.set_text_color(*_NAVY)
        pdf.cell(136, 9, "  TOTALE SPESE DOCUMENTATE", fill=True)
        pdf.set_text_color(*_BLUE)
        pdf.cell(0, 9, f"  EUR {total:.2f}", fill=True, ln=True)

        # Over-budget warning
        if budget_ref and total > budget_ref:
            pdf.ln(1)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*_RED)
            overage = total - budget_ref
            pdf.cell(0, 6, f"  ATTENZIONE: Sforamento budget di EUR {overage:.2f}", ln=True)

    # ── 4. Forecast AI (opzionale) ────────────────────────────────────────────
    if forecast_data:
        _section(pdf, "Analisi Previsionale AI")

        status     = forecast_data.get("budget_status", "ON_TRACK")
        projected  = (
            forecast_data.get("projected_total")
            or forecast_data.get("total_estimated_per_person", 0)
        )
        confidence = forecast_data.get("confidence_score", 0)
        advice     = forecast_data.get("savings_advice") or [forecast_data.get("advice", "-")]

        _kv(pdf, "Spesa Proiettata", f"EUR {projected:.2f}")
        _kv(pdf, "Affidabilita AI",  f"{confidence}%")

        # Status badge
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_GREY)
        pdf.cell(52, 7, "Stato Budget:", ln=False)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_STATUS_COLOR.get(status, _GREY))
        pdf.cell(0, 7, _STATUS_LABEL.get(status, status), ln=True)

        # Savings tips
        if advice:
            pdf.ln(1)
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*_NAVY)
            pdf.cell(0, 7, "Consigli per il risparmio:", ln=True)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(60, 60, 60)
            for tip in advice[:3]:
                pdf.set_x(pdf.l_margin + 6)
                pdf.multi_cell(0, 6, f"- {_clean(str(tip))}")

    # ── 5. Blocco firme ───────────────────────────────────────────────────────
    if pdf.get_y() > 240:
        pdf.add_page()
    pdf.ln(14)
    pdf.set_draw_color(180, 180, 180)
    y = pdf.get_y()
    pdf.line(15,  y, 97,  y)
    pdf.line(113, y, 195, y)
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*_GREY)
    pdf.cell(97,  5, "Firma Dipendente",              align="C")
    pdf.cell(0,   5, "Firma Responsabile / Approvatore", align="C", ln=True)

    raw = pdf.output()
    return bytes(raw) if isinstance(raw, bytearray) else raw
