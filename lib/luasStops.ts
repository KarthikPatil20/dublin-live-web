// Luas stop coordinates (Red + Green lines). Codes match luasforecasts.rpa.ie `stop` param.
// Coordinates are the published stop locations; used to render lines + live arrival markers,
// since the RPA forecast API returns arrivals per stop rather than live tram GPS.

export interface LuasStop {
  code: string;
  name: string;
  lat: number;
  lng: number;
  line: "red" | "green";
}

export const LUAS_STOPS: LuasStop[] = [
  // ---- Red Line (west/southwest to city / The Point) ----
  { code: "TPT", name: "The Point", lat: 53.3479, lng: -6.2299, line: "red" },
  { code: "SDK", name: "Spencer Dock", lat: 53.3487, lng: -6.2378, line: "red" },
  { code: "MYS", name: "Mayor Square - NCI", lat: 53.3492, lng: -6.2436, line: "red" },
  { code: "GDK", name: "George's Dock", lat: 53.3494, lng: -6.2482, line: "red" },
  { code: "CQY", name: "Connolly", lat: 53.3512, lng: -6.2503, line: "red" },
  { code: "BUS", name: "Busáras", lat: 53.3499, lng: -6.2513, line: "red" },
  { code: "ABB", name: "Abbey Street", lat: 53.3487, lng: -6.2578, line: "red" },
  { code: "JER", name: "Jervis", lat: 53.3474, lng: -6.2668, line: "red" },
  { code: "FOU", name: "Four Courts", lat: 53.3459, lng: -6.2727, line: "red" },
  { code: "SMI", name: "Smithfield", lat: 53.3474, lng: -6.2782, line: "red" },
  { code: "MUS", name: "Museum", lat: 53.3479, lng: -6.2856, line: "red" },
  { code: "HEU", name: "Heuston", lat: 53.3462, lng: -6.2917, line: "red" },
  { code: "JAM", name: "James's", lat: 53.3416, lng: -6.2938, line: "red" },
  { code: "FAT", name: "Fatima", lat: 53.3378, lng: -6.2951, line: "red" },
  { code: "RIA", name: "Rialto", lat: 53.3355, lng: -6.2988, line: "red" },
  { code: "SUI", name: "Suir Road", lat: 53.3331, lng: -6.3059, line: "red" },
  { code: "GOL", name: "Goldenbridge", lat: 53.3316, lng: -6.3138, line: "red" },
  { code: "DRI", name: "Drimnagh", lat: 53.3295, lng: -6.3199, line: "red" },
  { code: "BLA", name: "Blackhorse", lat: 53.3272, lng: -6.3266, line: "red" },
  { code: "BLU", name: "Bluebell", lat: 53.3236, lng: -6.3376, line: "red" },
  { code: "KYL", name: "Kylemore", lat: 53.3260, lng: -6.3444, line: "red" },
  { code: "RED", name: "Red Cow", lat: 53.3204, lng: -6.3833, line: "red" },
  { code: "KIN", name: "Kingswood", lat: 53.3095, lng: -6.3928, line: "red" },
  { code: "BEL", name: "Belgard", lat: 53.3013, lng: -6.3777, line: "red" },
  { code: "COO", name: "Cookstown", lat: 53.2911, lng: -6.3781, line: "red" },
  { code: "HOS", name: "Hospital", lat: 53.2874, lng: -6.3810, line: "red" },
  { code: "TAL", name: "Tallaght", lat: 53.2874, lng: -6.3733, line: "red" },
  { code: "FET", name: "Fettercairn", lat: 53.2929, lng: -6.4022, line: "red" },
  { code: "CVN", name: "Cheeverstown", lat: 53.2895, lng: -6.4147, line: "red" },
  { code: "CIT", name: "Citywest Campus", lat: 53.2842, lng: -6.4256, line: "red" },
  { code: "FOR", name: "Fortunestown", lat: 53.2809, lng: -6.4297, line: "red" },
  { code: "SAG", name: "Saggart", lat: 53.2809, lng: -6.4419, line: "red" },

  // ---- Green Line (Broombridge to Brides Glen) ----
  { code: "BRO", name: "Broombridge", lat: 53.3720, lng: -6.2947, line: "green" },
  { code: "CAB", name: "Cabra", lat: 53.3665, lng: -6.2895, line: "green" },
  { code: "PHI", name: "Phibsborough", lat: 53.3625, lng: -6.2810, line: "green" },
  { code: "GRA", name: "Grangegorman", lat: 53.3560, lng: -6.2790, line: "green" },
  { code: "BRD", name: "Broadstone - DIT", lat: 53.3548, lng: -6.2727, line: "green" },
  { code: "DOM", name: "Dominick", lat: 53.3520, lng: -6.2680, line: "green" },
  { code: "PAR", name: "Parnell", lat: 53.3535, lng: -6.2620, line: "green" },
  { code: "MAR", name: "Marlborough", lat: 53.3495, lng: -6.2585, line: "green" },
  { code: "TRY", name: "Trinity", lat: 53.3456, lng: -6.2578, line: "green" },
  { code: "DAW", name: "Dawson", lat: 53.3413, lng: -6.2589, line: "green" },
  { code: "STS", name: "St. Stephen's Green", lat: 53.3390, lng: -6.2610, line: "green" },
  { code: "HAR", name: "Harcourt", lat: 53.3339, lng: -6.2627, line: "green" },
  { code: "CHA", name: "Charlemont", lat: 53.3299, lng: -6.2603, line: "green" },
  { code: "RNC", name: "Ranelagh", lat: 53.3258, lng: -6.2560, line: "green" },
  { code: "BEE", name: "Beechwood", lat: 53.3213, lng: -6.2535, line: "green" },
  { code: "COW", name: "Cowper", lat: 53.3162, lng: -6.2530, line: "green" },
  { code: "MIL", name: "Milltown", lat: 53.3103, lng: -6.2510, line: "green" },
  { code: "WIN", name: "Windy Arbour", lat: 53.3020, lng: -6.2490, line: "green" },
  { code: "DUN", name: "Dundrum", lat: 53.2938, lng: -6.2470, line: "green" },
  { code: "BAL", name: "Balally", lat: 53.2870, lng: -6.2380, line: "green" },
  { code: "KIL", name: "Kilmacud", lat: 53.2843, lng: -6.2250, line: "green" },
  { code: "STI", name: "Stillorgan", lat: 53.2820, lng: -6.2100, line: "green" },
  { code: "SAN", name: "Sandyford", lat: 53.2780, lng: -6.2000, line: "green" },
  { code: "CPK", name: "Central Park", lat: 53.2740, lng: -6.1980, line: "green" },
  { code: "GLE", name: "Glencairn", lat: 53.2680, lng: -6.1930, line: "green" },
  { code: "GAL", name: "The Gallops", lat: 53.2620, lng: -6.1870, line: "green" },
  { code: "LEO", name: "Leopardstown Valley", lat: 53.2570, lng: -6.1820, line: "green" },
  { code: "BAK", name: "Ballyogan Wood", lat: 53.2520, lng: -6.1780, line: "green" },
  { code: "RAC", name: "Racecourse", lat: 53.2470, lng: -6.1720, line: "green" },
  { code: "CAR", name: "Carrickmines", lat: 53.2440, lng: -6.1670, line: "green" },
  { code: "LAU", name: "Laughanstown", lat: 53.2400, lng: -6.1600, line: "green" },
  { code: "CHE", name: "Cherrywood", lat: 53.2380, lng: -6.1560, line: "green" },
  { code: "BRI", name: "Brides Glen", lat: 53.2350, lng: -6.1510, line: "green" },
];
