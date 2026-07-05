// Luas stop coordinates (Red + Green lines).
// Coordinates are the OFFICIAL published stop locations (sourced from OpenStreetMap
// railway=tram_stop nodes, deduplicated). Stops are listed in true running order so
// the map can draw each line by connecting consecutive stops.
// `code` values are the RPA luasforecasts.rpa.ie `stop` params for live arrivals.

export interface LuasStop {
  code: string;
  name: string;
  lat: number;
  lng: number;
  line: "red" | "green";
}

// RED LINE — The Point ↔ Tallaght (main trunk), then the Saggart branch.
const RED_MAIN: LuasStop[] = [
  { code: "TPT", name: "The Point", lat: 53.34835, lng: -6.229249, line: "red" },
  { code: "SDK", name: "Spencer Dock", lat: 53.348816, lng: -6.237155, line: "red" },
  { code: "MYS", name: "Mayor Square - NCI", lat: 53.349242, lng: -6.243389, line: "red" },
  { code: "GDK", name: "George's Dock", lat: 53.349527, lng: -6.247586, line: "red" },
  { code: "CON", name: "Connolly", lat: 53.350903, lng: -6.249943, line: "red" },
  { code: "BUS", name: "Busáras", lat: 53.350101, lng: -6.251513, line: "red" },
  { code: "ABB", name: "Abbey Street", lat: 53.348599, lng: -6.25817, line: "red" },
  { code: "JER", name: "Jervis", lat: 53.347668, lng: -6.265538, line: "red" },
  { code: "FOU", name: "Four Courts", lat: 53.346884, lng: -6.273672, line: "red" },
  { code: "SMI", name: "Smithfield", lat: 53.347154, lng: -6.277779, line: "red" },
  { code: "MUS", name: "Museum", lat: 53.347873, lng: -6.286734, line: "red" },
  { code: "HEU", name: "Heuston", lat: 53.346656, lng: -6.291735, line: "red" },
  { code: "JAM", name: "James's", lat: 53.341889, lng: -6.293326, line: "red" },
  { code: "FAT", name: "Fatima", lat: 53.338445, lng: -6.292512, line: "red" },
  { code: "RIA", name: "Rialto", lat: 53.337924, lng: -6.297226, line: "red" },
  { code: "SUI", name: "Suir Road", lat: 53.336623, lng: -6.307278, line: "red" },
  { code: "GOL", name: "Goldenbridge", lat: 53.335904, lng: -6.31357, line: "red" },
  { code: "DRI", name: "Drimnagh", lat: 53.335383, lng: -6.318081, line: "red" },
  { code: "BLA", name: "Blackhorse", lat: 53.334261, lng: -6.327412, line: "red" },
  { code: "BLU", name: "Bluebell", lat: 53.329278, lng: -6.333867, line: "red" },
  { code: "KYL", name: "Kylemore", lat: 53.326633, lng: -6.343562, line: "red" },
  { code: "RED", name: "Red Cow", lat: 53.316853, lng: -6.369873, line: "red" },
  { code: "KIN", name: "Kingswood", lat: 53.303691, lng: -6.365293, line: "red" },
  { code: "BEL", name: "Belgard", lat: 53.298931, lng: -6.375368, line: "red" },
  { code: "COO", name: "Cookstown", lat: 53.293506, lng: -6.384387, line: "red" },
  { code: "HOS", name: "Hospital", lat: 53.289391, lng: -6.378862, line: "red" },
  { code: "TAL", name: "Tallaght", lat: 53.287485, lng: -6.374667, line: "red" },
];
const RED_SAGGART: LuasStop[] = [
  { code: "FET", name: "Fettercairn", lat: 53.293529, lng: -6.395524, line: "red" },
  { code: "CVN", name: "Cheeverstown", lat: 53.290986, lng: -6.406842, line: "red" },
  { code: "CIT", name: "Citywest Campus", lat: 53.287828, lng: -6.418924, line: "red" },
  { code: "FOR", name: "Fortunestown", lat: 53.284271, lng: -6.42458, line: "red" },
  { code: "SAG", name: "Saggart", lat: 53.284681, lng: -6.437731, line: "red" },
];

// GREEN LINE — Broombridge ↔ Bride’s Glen (single line, true order).
const GREEN_LINE: LuasStop[] = [
  { code: "BRO", name: "Broombridge", lat: 53.37233, lng: -6.298084, line: "green" },
  { code: "CAB", name: "Cabra", lat: 53.364121, lng: -6.281801, line: "green" },
  { code: "PHI", name: "Phibsborough", lat: 53.360427, lng: -6.278918, line: "green" },
  { code: "GRA", name: "Grangegorman", lat: 53.357105, lng: -6.277337, line: "green" },
  { code: "BRD", name: "Broadstone - DIT", lat: 53.35407, lng: -6.273779, line: "green" },
  { code: "DOM", name: "Dominick", lat: 53.351403, lng: -6.265631, line: "green" },
  { code: "PAR", name: "Parnell", lat: 53.353084, lng: -6.260472, line: "green" },
  { code: "OUP", name: "O'Connell Upper", lat: 53.351591, lng: -6.261057, line: "green" },
  { code: "OGP", name: "O'Connell - GPO", lat: 53.348844, lng: -6.259919, line: "green" },
  { code: "MAR", name: "Marlborough", lat: 53.349185, lng: -6.257756, line: "green" },
  { code: "WES", name: "Westmoreland", lat: 53.346327, lng: -6.259015, line: "green" },
  { code: "TRY", name: "Trinity", lat: 53.34533, lng: -6.258273, line: "green" },
  { code: "DAW", name: "Dawson", lat: 53.342121, lng: -6.25797, line: "green" },
  { code: "STS", name: "St. Stephen's Green", lat: 53.339062, lng: -6.261339, line: "green" },
  { code: "HAR", name: "Harcourt", lat: 53.333361, lng: -6.262638, line: "green" },
  { code: "CHA", name: "Charlemont", lat: 53.330714, lng: -6.258698, line: "green" },
  { code: "RAN", name: "Ranelagh", lat: 53.326291, lng: -6.25616, line: "green" },
  { code: "BEE", name: "Beechwood", lat: 53.320843, lng: -6.254645, line: "green" },
  { code: "COW", name: "Cowper", lat: 53.31648, lng: -6.25344, line: "green" },
  { code: "MIL", name: "Milltown", lat: 53.309914, lng: -6.251734, line: "green" },
  { code: "WIN", name: "Windy Arbour", lat: 53.301589, lng: -6.250714, line: "green" },
  { code: "DUN", name: "Dundrum", lat: 53.29239, lng: -6.245134, line: "green" },
  { code: "BAL", name: "Balally", lat: 53.286063, lng: -6.236707, line: "green" },
  { code: "KIL", name: "Kilmacud", lat: 53.28301, lng: -6.223912, line: "green" },
  { code: "STI", name: "Stillorgan", lat: 53.279397, lng: -6.210168, line: "green" },
  { code: "SAN", name: "Sandyford", lat: 53.27767, lng: -6.204929, line: "green" },
  { code: "CPK", name: "Central Park", lat: 53.270109, lng: -6.203849, line: "green" },
  { code: "GLE", name: "Glencairn", lat: 53.266285, lng: -6.210016, line: "green" },
  { code: "GAL", name: "The Gallops", lat: 53.261136, lng: -6.205937, line: "green" },
  { code: "LEO", name: "Leopardstown Valley", lat: 53.25827, lng: -6.198385, line: "green" },
  { code: "BAW", name: "Ballyogan Wood", lat: 53.255027, lng: -6.184428, line: "green" },
  { code: "CAR", name: "Carrickmines", lat: 53.254033, lng: -6.169956, line: "green" },
  { code: "LAU", name: "Laughanstown", lat: 53.250606, lng: -6.155006, line: "green" },
  { code: "CHE", name: "Cherrywood", lat: 53.245346, lng: -6.145875, line: "green" },
  { code: "BRI", name: "Bride's Glen", lat: 53.242053, lng: -6.142873, line: "green" },
];

export const LUAS_STOPS: LuasStop[] = [...RED_MAIN, ...RED_SAGGART, ...GREEN_LINE];

// Ordered segments for drawing continuous line geometry (no zig-zag across branches).
export const LUAS_SEGMENTS: { line: "red" | "green"; stops: LuasStop[] }[] = [
  { line: "red", stops: RED_MAIN },
  { line: "red", stops: [RED_MAIN[RED_MAIN.indexOf(RED_MAIN.find(s=>s.code==="BEL")!)], ...RED_SAGGART] },
  { line: "green", stops: GREEN_LINE },
];
