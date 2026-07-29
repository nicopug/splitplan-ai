"""Test sulla coerenza oraria dell'itinerario generato.

L'ottimizzatore CP-SAT assegnava alle attivita' non-ancora un dominio libero fra
le 06:00 e le 23:00, scartando gli orari scelti dal modello. Il risultato erano
giornate senza senso: "Lavoro Pomeridiano" pianificato alle 06:00 e il tragitto
hotel->ufficio subito dopo.
"""

import asyncio

from services.itinerary_optimizer import optimize_travel_itinerary

GIORNO = "2026-09-01"


def att(titolo, tipo, inizio, fine, lat=44.50, lon=11.35):
    return {
        "title": titolo, "type": tipo,
        "start_time": f"{GIORNO}T{inizio}:00", "end_time": f"{GIORNO}T{fine}:00",
        "lat": lat, "lon": lon,
    }


def ottimizza(attivita):
    risultato = asyncio.run(optimize_travel_itinerary(attivita))
    per_titolo = {v["title"]: v["start_time"][11:16] for v in risultato.get("schedule", [])}
    return risultato, per_titolo


def test_lavoro_pomeridiano_resta_di_pomeriggio():
    _, orari = ottimizza([
        att("Trasferimento hotel-ufficio", "TRANSPORT", "08:00", "08:30", 44.49, 11.34),
        att("Lavoro Mattutino", "ACTIVITY", "09:00", "13:00"),
        att("Pausa pranzo", "FOOD", "13:00", "14:00"),
        att("Lavoro Pomeridiano", "ACTIVITY", "14:00", "18:00"),
        att("Cena", "FOOD", "19:30", "21:00", 44.49, 11.34),
    ])
    assert "12:00" <= orari["Lavoro Pomeridiano"] <= "17:00", (
        f"pianificato alle {orari['Lavoro Pomeridiano']}, doveva restare di pomeriggio"
    )


def test_il_mattino_resta_di_mattina():
    _, orari = ottimizza([
        att("Colazione", "FOOD", "07:30", "08:15"),
        att("Lavoro Mattutino", "ACTIVITY", "09:00", "13:00"),
        att("Cena", "FOOD", "20:00", "21:30"),
    ])
    assert orari["Colazione"] < "10:00"
    assert orari["Lavoro Mattutino"] < "12:00"
    assert orari["Cena"] > "18:00"


def test_nessuna_attivita_prima_dell_alba():
    _, orari = ottimizza([
        att("Lavoro Pomeridiano", "ACTIVITY", "14:00", "18:00"),
        att("Cena", "FOOD", "19:30", "21:00"),
    ])
    for titolo, ora in orari.items():
        assert ora >= "06:00", f"{titolo} pianificato alle {ora}"
        assert ora <= "22:00", f"{titolo} pianificato alle {ora}"


def test_scostamento_contenuto_dall_orario_previsto():
    """L'ottimizzatore puo' compattare, ma non stravolgere la giornata."""
    previsti = {"Lavoro Mattutino": "09:00", "Pausa pranzo": "13:00", "Lavoro Pomeridiano": "14:00"}
    _, orari = ottimizza([
        att("Lavoro Mattutino", "ACTIVITY", "09:00", "13:00"),
        att("Pausa pranzo", "FOOD", "13:00", "14:00"),
        att("Lavoro Pomeridiano", "ACTIVITY", "14:00", "18:00"),
    ])
    for titolo, atteso in previsti.items():
        eff_min = int(orari[titolo][:2]) * 60 + int(orari[titolo][3:])
        att_min = int(atteso[:2]) * 60 + int(atteso[3:])
        assert abs(eff_min - att_min) <= 90, (
            f"{titolo}: previsto {atteso}, pianificato {orari[titolo]}"
        )


def test_giornata_vuota_e_singola_attivita():
    assert asyncio.run(optimize_travel_itinerary([])).get("schedule") == []
    _, orari = ottimizza([att("Unica riunione", "ACTIVITY", "10:00", "11:00")])
    assert len(orari) == 1
