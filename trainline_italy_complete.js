/**
 * ═══════════════════════════════════════════════════════════════════════
 *  TRAINLINE ITALY — DIZIONARIO CITTÀ + GENERATORE LINK
 *  Tutti gli ID sono stati verificati manualmente su Trainline
 * ═══════════════════════════════════════════════════════════════════════
 */

const TRAINLINE_STATIONS = {

    // ══════════════════════════════════════
    //  NORD-OVEST
    // ══════════════════════════════════════

    "Milano": { id: "8483", region: "Lombardia" }, // ✅
    "Torino": { id: "8565", region: "Piemonte" }, // ✅
    "Genova": { id: "8540", region: "Liguria" }, // ✅
    "Bergamo": { id: "19344", region: "Lombardia" }, // ✅
    "Varese": { id: "22091", region: "Lombardia" }, // ✅
    "Como": { id: "29244", region: "Lombardia" }, // ✅
    "Mantova": { id: "19851", region: "Lombardia" }, // ✅
    "Sanremo": { id: "20466", region: "Liguria" }, // ✅
    "La Spezia": { id: "20898", region: "Liguria" }, // ✅

    // ══════════════════════════════════════
    //  NORD-EST
    // ══════════════════════════════════════

    "Venezia": { id: "8543", region: "Veneto" }, // ✅
    "Padova": { id: "8528", region: "Veneto" }, // ✅
    "Trento": { id: "18829", region: "Trentino" }, // ✅
    "Bolzano": { id: "17484", region: "Alto Adige" }, // ✅
    "Trieste": { id: "29020", region: "FVG" }, // ✅
    "Udine": { id: "20642", region: "FVG" }, // ✅

    // ══════════════════════════════════════
    //  EMILIA-ROMAGNA
    // ══════════════════════════════════════

    "Bologna": { id: "22159", region: "Emilia-Romagna" }, // ✅
    "Modena": { id: "8493", region: "Emilia-Romagna" }, // ✅

    // ══════════════════════════════════════
    //  TOSCANA
    // ══════════════════════════════════════

    "Firenze": { id: "8433", region: "Toscana" }, // ✅
    "Pisa": { id: "22187", region: "Toscana" }, // ✅
    "Siena": { id: "20640", region: "Toscana" }, // ✅
    "Empoli": { id: "19975", region: "Toscana" }, // ✅

    // ══════════════════════════════════════
    //  CENTRO
    // ══════════════════════════════════════

    "Roma": { id: "8542", region: "Lazio" }, // ✅
    "Perugia": { id: "19581", region: "Umbria" }, // ✅
    "Ancona": { id: "22189", region: "Marche" }, // ✅
    "L'Aquila": { id: "19914", region: "Abruzzo" }, // ✅

    // ══════════════════════════════════════
    //  SUD
    // ══════════════════════════════════════

    "Napoli": { id: "22184", region: "Campania" }, // ✅
    "Bari": { id: "22157", region: "Puglia" }, // ✅
    "Lecce": { id: "20733", region: "Puglia" }, // ✅
    "Cosenza": { id: "19252", region: "Calabria" }, // ✅
    "Reggio Calabria": { id: "8539", region: "Calabria" }, // ✅

    // ══════════════════════════════════════
    //  ISOLE
    // ══════════════════════════════════════

    "Palermo": { id: "22186", region: "Sicilia" }, // ✅
    "Catania": { id: "22160", region: "Sicilia" }, // ✅
    "Cagliari": { id: "19387", region: "Sardegna" }, // ✅
};


// ═══════════════════════════════════════════════════════════════════════
//  GENERATORE LINK TRAINLINE
// ═══════════════════════════════════════════════════════════════════════

/**
 * Genera URL di ricerca Trainline
 *
 * @param {Object} params
 * @param {string}  params.origin        - Nome città (chiave del dizionario)
 * @param {string}  params.destination   - Nome città destinazione
 * @param {string}  params.outwardDate   - Data/ora ISO 8601: "2026-03-05T09:00:00"
 * @param {string}  [params.inwardDate]  - Data/ora ritorno (ometti per solo andata)
 * @param {string}  [params.lang]        - "it" | "en" | "fr" | "de" (default "it")
 * @returns {string} URL Trainline completo
 */
function generateTrainlineURL(params) {
    const { origin, destination, outwardDate, inwardDate, lang = "it" } = params;
    const type = inwardDate ? "return" : "single";

    const originStation = TRAINLINE_STATIONS[origin];
    const destStation = TRAINLINE_STATIONS[destination];

    if (!originStation) throw new Error(`❌ Città non trovata: "${origin}"`);
    if (!destStation) throw new Error(`❌ Città non trovata: "${destination}"`);

    const queryParams = new URLSearchParams({
        journeySearchType: type,
        origin: `urn:trainline:generic:loc:${originStation.id}`,
        destination: `urn:trainline:generic:loc:${destStation.id}`,
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
//  HELPER: RICERCA CITTÀ PER NOME PARZIALE
// ═══════════════════════════════════════════════════════════════════════

function searchStation(query) {
    const q = query.toLowerCase().trim();
    return Object.keys(TRAINLINE_STATIONS).filter(name =>
        name.toLowerCase().includes(q)
    );
}


// ═══════════════════════════════════════════════════════════════════════
//  HELPER: LISTA CITTÀ PER REGIONE
// ═══════════════════════════════════════════════════════════════════════

function getStationsByRegion(regionName) {
    return Object.entries(TRAINLINE_STATIONS)
        .filter(([, data]) => data.region.toLowerCase().includes(regionName.toLowerCase()))
        .map(([name]) => name);
}


// ═══════════════════════════════════════════════════════════════════════
//  ESEMPI DI UTILIZZO
// ═══════════════════════════════════════════════════════════════════════

// A/R Milano → Roma
const link1 = generateTrainlineURL({
    origin: "Milano",
    destination: "Roma",
    outwardDate: "2026-03-10T08:00:00",
    inwardDate: "2026-03-12T19:00:00",
});
console.log("🚆 A/R Milano→Roma:", link1);

// Sola andata Bologna → Firenze
const link2 = generateTrainlineURL({
    origin: "Bologna",
    destination: "Firenze",
    outwardDate: "2026-04-01T07:30:00",
});
console.log("🚆 Bologna→Firenze:", link2);

console.log("\n🔍 Cerca 'ca':", searchStation("ca"));
console.log("📍 Toscana:", getStationsByRegion("Toscana"));

// CommonJS:  module.exports = { TRAINLINE_STATIONS, generateTrainlineURL, searchStation, getStationsByRegion };
// ESM:       export { TRAINLINE_STATIONS, generateTrainlineURL, searchStation, getStationsByRegion };