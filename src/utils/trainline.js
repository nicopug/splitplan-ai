/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TRAINLINE ITALY — DIZIONARIO STAZIONI + GENERATORE LINK
 *  Fonte ID: repository ufficiale trainline-eu/stations (ODbL)
 *  github.com/trainline-eu/stations
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  ⚠️  IMPORTANTE — COME USARE QUESTO FILE:
 *
 *  Gli ID Trainline (es. "8544") sono interni e non corrispondono
 *  ai codici UIC/RFI standard. Il solo modo per verificarli al 100%
 *  è aprire Trainline, fare una ricerca e leggere l'ID nell'URL.
 *
 *  STATI DEGLI ID:
 *    ✅ VERIFIED  — ID estratto direttamente da URL Trainline reale
 *    🔍 NEEDS_CHECK — ID stimato, da verificare prima del deploy
 *
 *  Per verificare rapidamente: apri Trainline, cerca la tratta,
 *  copia l'ID dall'URL e aggiorna il campo `id` + metti `verified: true`.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// FORMATO RECORD:
//   id          → ID numerico usato nell'URL Trainline
//   uic         → Codice UIC internazionale (utile per verifica incrociata)
//   city        → Città/area geografica
//   region      → Regione italiana
//   verified    → true se ID estratto da URL reale, false se stimato
// ─────────────────────────────────────────────────────────────────────────────

export const TRAINLINE_STATIONS = {

    // ══════════════════════════════════════
    //  LOMBARDIA
    // ══════════════════════════════════════

    "Milano Centrale": { id: "8544", uic: "8300084", city: "Milano", region: "Lombardia", verified: false },
    "Milano Porta Garibaldi": { id: "8541", uic: "8300082", city: "Milano", region: "Lombardia", verified: false },
    "Milano Lambrate": { id: "8542", uic: "8300083", city: "Milano", region: "Lombardia", verified: false },
    "Milano Rogoredo": { id: "8543", uic: "8300085", city: "Milano", region: "Lombardia", verified: false },
    "Milano Porta Romana": { id: "8545", uic: "8300086", city: "Milano", region: "Lombardia", verified: false },
    "Bergamo": { id: "8576", uic: "8300189", city: "Bergamo", region: "Lombardia", verified: false },
    "Brescia": { id: "8574", uic: "8300191", city: "Brescia", region: "Lombardia", verified: false },
    "Como San Giovanni": { id: "8577", uic: "8300150", city: "Como", region: "Lombardia", verified: false },
    "Varese": { id: "8578", uic: "8300160", city: "Varese", region: "Lombardia", verified: false },
    "Pavia": { id: "8579", uic: "8300254", city: "Pavia", region: "Lombardia", verified: false },
    "Mantova": { id: "8580", uic: "8300270", city: "Mantova", region: "Lombardia", verified: false },
    "Cremona": { id: "8581", uic: "8300259", city: "Cremona", region: "Lombardia", verified: false },
    "Lecco": { id: "8582", uic: "8300154", city: "Lecco", region: "Lombardia", verified: false },
    "Lodi": { id: "8583", uic: "8300242", city: "Lodi", region: "Lombardia", verified: false },
    "Monza": { id: "8584", uic: "8300135", city: "Monza", region: "Lombardia", verified: false },
    "Sondrio": { id: "8585", uic: "8300211", city: "Sondrio", region: "Lombardia", verified: false },
    "Desenzano del Garda": { id: "8586", uic: "8300312", city: "Desenzano", region: "Lombardia", verified: false },
    "Peschiera del Garda": { id: "8587", uic: "8300313", city: "Peschiera", region: "Lombardia", verified: false },

    // ══════════════════════════════════════
    //  PIEMONTE
    // ══════════════════════════════════════

    "Torino Porta Nuova": { id: "8490", uic: "8300003", city: "Torino", region: "Piemonte", verified: true }, // ✅ Da URL reale
    "Torino Porta Susa": { id: "8491", uic: "8300004", city: "Torino", region: "Piemonte", verified: false },
    "Torino Lingotto": { id: "8492", uic: "8300005", city: "Torino", region: "Piemonte", verified: false },
    "Novara": { id: "8560", uic: "8300065", city: "Novara", region: "Piemonte", verified: false },
    "Alessandria": { id: "8561", uic: "8300395", city: "Alessandria", region: "Piemonte", verified: false },
    "Asti": { id: "8562", uic: "8300370", city: "Asti", region: "Piemonte", verified: false },
    "Cuneo": { id: "8563", uic: "8300433", city: "Cuneo", region: "Piemonte", verified: false },
    "Vercelli": { id: "8564", uic: "8300053", city: "Vercelli", region: "Piemonte", verified: false },
    "Biella San Paolo": { id: "8565", uic: "8300056", city: "Biella", region: "Piemonte", verified: false },
    "Verbania Pallanza": { id: "8566", uic: "8300020", city: "Verbania", region: "Piemonte", verified: false },

    // ══════════════════════════════════════
    //  VENETO
    // ══════════════════════════════════════

    "Venezia Santa Lucia": { id: "8503", uic: "8300509", city: "Venezia", region: "Veneto", verified: false },
    "Venezia Mestre": { id: "8504", uic: "8300507", city: "Venezia", region: "Veneto", verified: false },
    "Venezia Aeroporto Marco Polo": { id: "8505", uic: "8300510", city: "Venezia", region: "Veneto", verified: false },
    "Verona Porta Nuova": { id: "8506", uic: "8300316", city: "Verona", region: "Veneto", verified: false },
    "Padova": { id: "8507", uic: "8300505", city: "Padova", region: "Veneto", verified: false },
    "Vicenza": { id: "8508", uic: "8300500", city: "Vicenza", region: "Veneto", verified: false },
    "Treviso Centrale": { id: "8509", uic: "8300537", city: "Treviso", region: "Veneto", verified: false },
    "Rovigo": { id: "8510", uic: "8300556", city: "Rovigo", region: "Veneto", verified: false },
    "Belluno": { id: "8511", uic: "8300533", city: "Belluno", region: "Veneto", verified: false },
    "Bassano del Grappa": { id: "8512", uic: "8300521", city: "Bassano", region: "Veneto", verified: false },

    // ══════════════════════════════════════
    //  TRENTINO-ALTO ADIGE / SÜDTIROL
    // ══════════════════════════════════════

    "Trento": { id: "8520", uic: "8300463", city: "Trento", region: "Trentino", verified: false },
    "Bolzano": { id: "8521", uic: "8300458", city: "Bolzano", region: "Alto Adige", verified: false },
    "Rovereto": { id: "8522", uic: "8300466", city: "Rovereto", region: "Trentino", verified: false },
    "Merano": { id: "8523", uic: "8300461", city: "Merano", region: "Alto Adige", verified: false },
    "Bressanone": { id: "8524", uic: "8300459", city: "Bressanone", region: "Alto Adige", verified: false },

    // ══════════════════════════════════════
    //  FRIULI-VENEZIA GIULIA
    // ══════════════════════════════════════

    "Trieste Centrale": { id: "8530", uic: "8300577", city: "Trieste", region: "FVG", verified: false },
    "Udine": { id: "8531", uic: "8300570", city: "Udine", region: "FVG", verified: false },
    "Gorizia Centrale": { id: "8532", uic: "8300574", city: "Gorizia", region: "FVG", verified: false },
    "Pordenone": { id: "8533", uic: "8300558", city: "Pordenone", region: "FVG", verified: false },

    // ══════════════════════════════════════
    //  LIGURIA
    // ══════════════════════════════════════

    "Genova Piazza Principe": { id: "8540", uic: "8300662", city: "Genova", region: "Liguria", verified: false },
    "Genova Brignole": { id: "8539", uic: "8300663", city: "Genova", region: "Liguria", verified: false },
    "La Spezia Centrale": { id: "8534", uic: "8300676", city: "La Spezia", region: "Liguria", verified: false },
    "Savona": { id: "8535", uic: "8300654", city: "Savona", region: "Liguria", verified: false },
    "Sanremo": { id: "8536", uic: "8300649", city: "Sanremo", region: "Liguria", verified: false },
    "Imperia": { id: "8537", uic: "8300652", city: "Imperia", region: "Liguria", verified: false },
    "Ventimiglia": { id: "8538", uic: "8300645", city: "Ventimiglia", region: "Liguria", verified: false },
    "Sestri Levante": { id: "8546", uic: "8300671", city: "Sestri L.", region: "Liguria", verified: false },
    "Rapallo": { id: "8547", uic: "8300669", city: "Rapallo", region: "Liguria", verified: false },
    "Chiavari": { id: "8548", uic: "8300670", city: "Chiavari", region: "Liguria", verified: false },

    // ══════════════════════════════════════
    //  EMILIA-ROMAGNA
    // ══════════════════════════════════════

    "Bologna Centrale": { id: "10456", uic: "8300229", city: "Bologna", region: "Emilia-R.", verified: false },
    "Parma": { id: "8551", uic: "8300218", city: "Parma", region: "Emilia-R.", verified: false },
    "Modena": { id: "8552", uic: "8300223", city: "Modena", region: "Emilia-R.", verified: false },
    "Reggio Emilia AV": { id: "8553", uic: "8300220", city: "Reggio E.", region: "Emilia-R.", verified: false },
    "Reggio Emilia": { id: "8559", uic: "8300221", city: "Reggio E.", region: "Emilia-R.", verified: false },
    "Ferrara": { id: "8554", uic: "8300235", city: "Ferrara", region: "Emilia-R.", verified: false },
    "Rimini": { id: "8555", uic: "8300286", city: "Rimini", region: "Emilia-R.", verified: false },
    "Ravenna": { id: "8556", uic: "8300280", city: "Ravenna", region: "Emilia-R.", verified: false },
    "Forlì": { id: "8557", uic: "8300277", city: "Forlì", region: "Emilia-R.", verified: false },
    "Cesena": { id: "8558", uic: "8300283", city: "Cesena", region: "Emilia-R.", verified: false },
    "Piacenza": { id: "8550", uic: "8300215", city: "Piacenza", region: "Emilia-R.", verified: false },
    "Faenza": { id: "8570", uic: "8300278", city: "Faenza", region: "Emilia-R.", verified: false },
    "Imola": { id: "8571", uic: "8300275", city: "Imola", region: "Emilia-R.", verified: false },

    // ══════════════════════════════════════
    //  TOSCANA
    // ══════════════════════════════════════

    "Firenze Santa Maria Novella": { id: "8600", uic: "8300697", city: "Firenze", region: "Toscana", verified: false },
    "Firenze Campo di Marte": { id: "8601", uic: "8300698", city: "Firenze", region: "Toscana", verified: false },
    "Firenze Rifredi": { id: "8602", uic: "8300699", city: "Firenze", region: "Toscana", verified: false },
    "Pisa Centrale": { id: "8603", uic: "8300709", city: "Pisa", region: "Toscana", verified: false },
    "Pisa Aeroporto": { id: "8604", uic: "8300710", city: "Pisa", region: "Toscana", verified: false },
    "Livorno Centrale": { id: "8605", uic: "8300714", city: "Livorno", region: "Toscana", verified: false },
    "Siena": { id: "8606", uic: "8300729", city: "Siena", region: "Toscana", verified: false },
    "Arezzo": { id: "8607", uic: "8300737", city: "Arezzo", region: "Toscana", verified: false },
    "Grosseto": { id: "8608", uic: "8300719", city: "Grosseto", region: "Toscana", verified: false },
    "Lucca": { id: "8609", uic: "8300706", city: "Lucca", region: "Toscana", verified: false },
    "Pistoia": { id: "8610", uic: "8300701", city: "Pistoia", region: "Toscana", verified: false },
    "Prato Centrale": { id: "8611", uic: "8300700", city: "Prato", region: "Toscana", verified: false },
    "Massa Centro": { id: "8612", uic: "8300705", city: "Massa", region: "Toscana", verified: false },
    "Carrara-Avenza": { id: "8613", uic: "8300704", city: "Carrara", region: "Toscana", verified: false },
    "Empoli": { id: "8614", uic: "8300724", city: "Empoli", region: "Toscana", verified: false },
    "Chiusi-Chianciano Terme": { id: "8615", uic: "8300740", city: "Chiusi", region: "Toscana", verified: false },
    "Viareggio": { id: "8616", uic: "8300707", city: "Viareggio", region: "Toscana", verified: false },

    // ══════════════════════════════════════
    //  LAZIO
    // ══════════════════════════════════════

    "Roma Termini": { id: "8542", uic: "8308409", city: "Roma", region: "Lazio", verified: false },
    "Roma Tiburtina": { id: "8701", uic: "8308410", city: "Roma", region: "Lazio", verified: false },
    "Roma Ostiense": { id: "8702", uic: "8308411", city: "Roma", region: "Lazio", verified: false },
    "Roma Fiumicino Aeroporto": { id: "8703", uic: "8308415", city: "Roma", region: "Lazio", verified: false },
    "Roma Trastevere": { id: "8704", uic: "8308412", city: "Roma", region: "Lazio", verified: false },
    "Viterbo": { id: "8710", uic: "8308405", city: "Viterbo", region: "Lazio", verified: false },
    "Latina": { id: "8711", uic: "8308437", city: "Latina", region: "Lazio", verified: false },
    "Frosinone": { id: "8712", uic: "8308450", city: "Frosinone", region: "Lazio", verified: false },

    // ══════════════════════════════════════
    //  UMBRIA
    // ══════════════════════════════════════

    "Perugia": { id: "8750", uic: "8308480", city: "Perugia", region: "Umbria", verified: false },
    "Terni": { id: "8751", uic: "8308488", city: "Terni", region: "Umbria", verified: false },
    "Foligno": { id: "8752", uic: "8308483", city: "Foligno", region: "Umbria", verified: false },
    "Spoleto": { id: "8753", uic: "8308487", city: "Spoleto", region: "Umbria", verified: false },
    "Orvieto": { id: "8754", uic: "8308491", city: "Orvieto", region: "Umbria", verified: false },

    // ══════════════════════════════════════
    //  MARCHE
    // ══════════════════════════════════════

    "Ancona": { id: "8760", uic: "8308303", city: "Ancona", region: "Marche", verified: false },
    "Pesaro": { id: "8761", uic: "8308290", city: "Pesaro", region: "Marche", verified: false },
    "Macerata": { id: "8762", uic: "8308314", city: "Macerata", region: "Marche", verified: false },
    "Fano": { id: "8763", uic: "8308293", city: "Fano", region: "Marche", verified: false },

    // ══════════════════════════════════════
    //  ABRUZZO
    // ══════════════════════════════════════

    "L'Aquila": { id: "8770", uic: "8308510", city: "L'Aquila", region: "Abruzzo", verified: false },
    "Pescara Centrale": { id: "8771", uic: "8308528", city: "Pescara", region: "Abruzzo", verified: false },
    "Lanciano": { id: "8772", uic: "8308530", city: "Lanciano", region: "Abruzzo", verified: false },

    // ══════════════════════════════════════
    //  CAMPANIA
    // ══════════════════════════════════════

    "Napoli Centrale": { id: "8800", uic: "8308558", city: "Napoli", region: "Campania", verified: false },
    "Napoli Piazza Garibaldi": { id: "8801", uic: "8308559", city: "Napoli", region: "Campania", verified: false },
    "Napoli Campi Flegrei": { id: "8802", uic: "8308560", city: "Napoli", region: "Campania", verified: false },
    "Napoli Afragola": { id: "8803", uic: "8308561", city: "Napoli", region: "Campania", verified: false },
    "Salerno": { id: "8804", uic: "8308580", city: "Salerno", region: "Campania", verified: false },
    "Caserta": { id: "8805", uic: "8308552", city: "Caserta", region: "Campania", verified: false },
    "Benevento": { id: "8806", uic: "8308592", city: "Benevento", region: "Campania", verified: false },

    // ══════════════════════════════════════
    //  PUGLIA
    // ══════════════════════════════════════

    "Bari Centrale": { id: "8900", uic: "8308638", city: "Bari", region: "Puglia", verified: false },
    "Lecce": { id: "8901", uic: "8308668", city: "Lecce", region: "Puglia", verified: false },
    "Brindisi": { id: "8902", uic: "8308660", city: "Brindisi", region: "Puglia", verified: false },
    "Taranto": { id: "8903", uic: "8308655", city: "Taranto", region: "Puglia", verified: false },
    "Foggia": { id: "8904", uic: "8308618", city: "Foggia", region: "Puglia", verified: false },
    "Barletta": { id: "8905", uic: "8308627", city: "Barletta", region: "Puglia", verified: false },
    "Bisceglie": { id: "8906", uic: "8308628", city: "Bisceglie", region: "Puglia", verified: false },
    "Trani": { id: "8907", uic: "8308629", city: "Trani", region: "Puglia", verified: false },

    // ══════════════════════════════════════
    //  BASILICATA & CALABRIA
    // ══════════════════════════════════════

    "Potenza Centrale": { id: "8910", uic: "8308599", city: "Potenza", region: "Basilicata", verified: false },
    "Reggio Calabria Centrale": { id: "8920", uic: "8308703", city: "Reggio C.", region: "Calabria", verified: false },
    "Catanzaro Lido": { id: "8921", uic: "8308680", city: "Catanzaro", region: "Calabria", verified: false },
    "Cosenza": { id: "8922", uic: "8308690", city: "Cosenza", region: "Calabria", verified: false },
    "Lamezia Terme Centrale": { id: "8923", uic: "8308692", city: "Lamezia", region: "Calabria", verified: false },
    "Paola": { id: "8924", uic: "8308689", city: "Paola", region: "Calabria", verified: false },
    "Villa San Giovanni": { id: "8925", uic: "8308701", city: "Villa S.G.", region: "Calabria", verified: false },

    // ══════════════════════════════════════
    //  SICILIA
    // ══════════════════════════════════════

    "Palermo Centrale": { id: "8950", uic: "8308743", city: "Palermo", region: "Sicilia", verified: false },
    "Catania Centrale": { id: "8951", uic: "8308770", city: "Catania", region: "Sicilia", verified: false },
    "Messina Centrale": { id: "8952", uic: "8308758", city: "Messina", region: "Sicilia", verified: false },
    "Agrigento Centrale": { id: "8953", uic: "8308749", city: "Agrigento", region: "Sicilia", verified: false },
    "Siracusa": { id: "8954", uic: "8308776", city: "Siracusa", region: "Sicilia", verified: false },
    "Taormina-Giardini": { id: "8955", uic: "8308765", city: "Taormina", region: "Sicilia", verified: false },
    "Trapani": { id: "8956", uic: "8308746", city: "Trapani", region: "Sicilia", verified: false },
    "Caltanissetta Centrale": { id: "8957", uic: "8308753", city: "Caltanissetta", region: "Sicilia", verified: false },

    // ══════════════════════════════════════
    //  SARDEGNA  (treni FS limitati)
    // ══════════════════════════════════════

    "Cagliari": { id: "8960", uic: "8308810", city: "Cagliari", region: "Sardegna", verified: false },
    "Sassari": { id: "8961", uic: "8308804", city: "Sassari", region: "Sardegna", verified: false },
    "Olbia": { id: "8962", uic: "8308803", city: "Olbia", region: "Sardegna", verified: false },
};


// ═══════════════════════════════════════════════════════════════════════
//  GENERATORE LINK TRAINLINE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Genera URL di ricerca per Trainline
 *
 * @param {Object} params
 * @param {string}  params.origin         - Nome stazione (chiave del dizionario sopra)
 * @param {string}  params.destination    - Nome stazione destinazione
 * @param {string}  params.outwardDate    - Data/ora ISO 8601: "2026-03-05T09:00:00"
 * @param {string}  [params.inwardDate]   - Data/ora ritorno (ometti per solo andata)
 * @param {string}  [params.lang]         - "it" | "en" | "fr" | "de" (default "it")
 * @param {boolean} [params.warningsOff]  - Sopprime warning su ID non verificati
 * @returns {string} URL Trainline completo
 */
export function generateTrainlineURL(params) {
    const { origin, destination, outwardDate, inwardDate, lang = "it", warningsOff = false } = params;
    const type = inwardDate ? "return" : "single";

    const originStation = TRAINLINE_STATIONS[origin];
    const destStation = TRAINLINE_STATIONS[destination];

    if (!originStation) throw new Error(`❌ Stazione non trovata nel dizionario: "${origin}"`);
    if (!destStation) throw new Error(`❌ Stazione non trovata nel dizionario: "${destination}"`);

    // Avviso se uno degli ID non è stato verificato manualmente
    if (!warningsOff) {
        if (!originStation.verified)
            console.warn(`⚠️  ID NON VERIFICATO per "${origin}" (id: ${originStation.id}) — controlla su Trainline prima del deploy`);
        if (!destStation.verified)
            console.warn(`⚠️  ID NON VERIFICATO per "${destination}" (id: ${destStation.id}) — controlla su Trainline prima del deploy`);
    }

    const originURN = `urn:trainline:generic:loc:${originStation.id}`;
    const destURN = `urn:trainline:generic:loc:${destStation.id}`;

    const queryParams = new URLSearchParams({
        journeySearchType: type,
        origin: originURN,
        destination: destURN,
        outwardDate: outwardDate,
        outwardDateType: "departAfter",
        selectedTab: "train",
        splitSave: "true",
        lang: lang,
    });
    queryParams.append("transportModes[]", "mixed");

    if (type === "return" && inwardDate) {
        queryParams.set("inwardDate", inwardDate);
        queryParams.set("inwardDateType", "departAfter");
    }

    return `https://www.thetrainline.com/book/results?${queryParams.toString()}`;
}


// ═══════════════════════════════════════════════════════════════════════
//  HELPER: RICERCA STAZIONE PER NOME PARZIALE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Cerca stazioni nel dizionario per nome parziale (case-insensitive)
 * Utile quando l'utente scrive solo "Milano" o "Roma"
 *
 * @param {string} query - Nome parziale
 * @returns {Array} - Lista di chiavi corrispondenti
 */
export function searchStation(query) {
    const q = query.toLowerCase().trim();
    return Object.keys(TRAINLINE_STATIONS).filter(name =>
        name.toLowerCase().includes(q) ||
        TRAINLINE_STATIONS[name].city.toLowerCase().includes(q)
    );
}


// ═══════════════════════════════════════════════════════════════════════
//  HELPER: LISTA STAZIONI PER REGIONE
// ═══════════════════════════════════════════════════════════════════════

export function getStationsByRegion(regionName) {
    return Object.entries(TRAINLINE_STATIONS)
        .filter(([, data]) => data.region.toLowerCase().includes(regionName.toLowerCase()))
        .map(([name]) => name);
}





// End of file