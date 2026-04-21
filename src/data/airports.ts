import type { AirportCoordinates } from "@/types/flight";

export interface AirportRecord extends AirportCoordinates {
  name: string;
}

// Comprehensive airport database with accurate coordinates
export const airports: Record<string, AirportRecord> = {
  // North America
  'ATL': { lat: 33.6407, lon: -84.4277, name: 'Atlanta Hartsfield-Jackson' },
  'LAX': { lat: 33.9416, lon: -118.4085, name: 'Los Angeles International' },
  'ORD': { lat: 41.9742, lon: -87.9073, name: 'Chicago O\'Hare' },
  'DFW': { lat: 32.8998, lon: -97.0403, name: 'Dallas/Fort Worth' },
  'DEN': { lat: 39.8561, lon: -104.6737, name: 'Denver International' },
  'JFK': { lat: 40.6413, lon: -73.7781, name: 'New York JFK' },
  'SFO': { lat: 37.6213, lon: -122.3790, name: 'San Francisco International' },
  'SEA': { lat: 47.4502, lon: -122.3088, name: 'Seattle-Tacoma' },
  'LAS': { lat: 36.0840, lon: -115.1537, name: 'Las Vegas McCarran' },
  'MCO': { lat: 28.4312, lon: -81.3081, name: 'Orlando International' },
  'EWR': { lat: 40.6895, lon: -74.1745, name: 'Newark Liberty' },
  'MSP': { lat: 44.8848, lon: -93.2223, name: 'Minneapolis-St. Paul' },
  'BOS': { lat: 42.3656, lon: -71.0096, name: 'Boston Logan' },
  'DTW': { lat: 42.2125, lon: -83.3534, name: 'Detroit Metropolitan' },
  'PHL': { lat: 39.8729, lon: -75.2437, name: 'Philadelphia International' },
  'LGA': { lat: 40.7769, lon: -73.8740, name: 'New York LaGuardia' },
  'PHX': { lat: 33.4352, lon: -112.0101, name: 'Phoenix Sky Harbor' },
  'IAH': { lat: 29.9902, lon: -95.3368, name: 'Houston George Bush' },
  'MIA': { lat: 25.7959, lon: -80.2870, name: 'Miami International' },
  'CLT': { lat: 35.2140, lon: -80.9431, name: 'Charlotte Douglas' },
  'SAN': { lat: 32.7338, lon: -117.1933, name: 'San Diego International' },
  'PDX': { lat: 45.5898, lon: -122.5951, name: 'Portland International' },
  'YYZ': { lat: 43.6777, lon: -79.6248, name: 'Toronto Pearson' },
  'YVR': { lat: 49.1939, lon: -123.1844, name: 'Vancouver International' },
  'YUL': { lat: 45.4657, lon: -73.7448, name: 'Montreal-Trudeau' },
  'MEX': { lat: 19.4363, lon: -99.0721, name: 'Mexico City International' },
  
  // Europe
  'LHR': { lat: 51.4700, lon: -0.4543, name: 'London Heathrow' },
  'CDG': { lat: 49.0097, lon: 2.5479, name: 'Paris Charles de Gaulle' },
  'AMS': { lat: 52.3105, lon: 4.7683, name: 'Amsterdam Schiphol' },
  'FRA': { lat: 50.0379, lon: 8.5622, name: 'Frankfurt Airport' },
  'MAD': { lat: 40.4983, lon: -3.5676, name: 'Madrid-Barajas' },
  'BCN': { lat: 41.2974, lon: 2.0833, name: 'Barcelona-El Prat' },
  'FCO': { lat: 41.8003, lon: 12.2389, name: 'Rome Fiumicino' },
  'MUC': { lat: 48.3537, lon: 11.7750, name: 'Munich Airport' },
  'LGW': { lat: 51.1537, lon: -0.1821, name: 'London Gatwick' },
  'ZRH': { lat: 47.4582, lon: 8.5481, name: 'Zurich Airport' },
  'IST': { lat: 41.2753, lon: 28.7519, name: 'Istanbul Airport' },
  'VIE': { lat: 48.1103, lon: 16.5697, name: 'Vienna International' },
  'CPH': { lat: 55.6180, lon: 12.6508, name: 'Copenhagen Airport' },
  'OSL': { lat: 60.1939, lon: 11.1004, name: 'Oslo Gardermoen' },
  'ARN': { lat: 59.6519, lon: 17.9186, name: 'Stockholm Arlanda' },
  'DUB': { lat: 53.4213, lon: -6.2701, name: 'Dublin Airport' },
  'MAN': { lat: 53.3537, lon: -2.2750, name: 'Manchester Airport' },
  'EDI': { lat: 55.9500, lon: -3.3725, name: 'Edinburgh Airport' },
  'LIS': { lat: 38.7742, lon: -9.1342, name: 'Lisbon Portela' },
  'ATH': { lat: 37.9364, lon: 23.9445, name: 'Athens International' },
  'BRU': { lat: 50.9010, lon: 4.4856, name: 'Brussels Airport' },
  'PRG': { lat: 50.1008, lon: 14.2632, name: 'Prague Václav Havel' },
  'WAW': { lat: 52.1657, lon: 20.9671, name: 'Warsaw Chopin' },
  'BUD': { lat: 47.4297, lon: 19.2611, name: 'Budapest Ferenc Liszt' },
  'VCE': { lat: 45.5053, lon: 12.3519, name: 'Venice Marco Polo' },
  'MXP': { lat: 45.6306, lon: 8.7231, name: 'Milan Malpensa' },
  'NAP': { lat: 40.8860, lon: 14.2908, name: 'Naples International' },
  
  // Asia-Pacific
  'HND': { lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda' },
  'NRT': { lat: 35.7720, lon: 140.3929, name: 'Tokyo Narita' },
  'PEK': { lat: 40.0801, lon: 116.5846, name: 'Beijing Capital' },
  'PVG': { lat: 31.1443, lon: 121.8083, name: 'Shanghai Pudong' },
  'HKG': { lat: 22.3080, lon: 113.9185, name: 'Hong Kong International' },
  'SIN': { lat: 1.3644, lon: 103.9915, name: 'Singapore Changi' },
  'ICN': { lat: 37.4602, lon: 126.4407, name: 'Seoul Incheon' },
  'BKK': { lat: 13.6900, lon: 100.7501, name: 'Bangkok Suvarnabhumi' },
  'KUL': { lat: 2.7456, lon: 101.7072, name: 'Kuala Lumpur International' },
  'DEL': { lat: 28.5562, lon: 77.1000, name: 'Delhi Indira Gandhi' },
  'BOM': { lat: 19.0896, lon: 72.8656, name: 'Mumbai Chhatrapati Shivaji' },
  'SYD': { lat: -33.9399, lon: 151.1753, name: 'Sydney Kingsford Smith' },
  'MEL': { lat: -37.6690, lon: 144.8410, name: 'Melbourne Airport' },
  'AKL': { lat: -37.0082, lon: 174.7850, name: 'Auckland Airport' },
  'MNL': { lat: 14.5086, lon: 121.0194, name: 'Manila Ninoy Aquino' },
  'CGK': { lat: -6.1275, lon: 106.6537, name: 'Jakarta Soekarno-Hatta' },
  'TPE': { lat: 25.0797, lon: 121.2342, name: 'Taipei Taoyuan' },
  'CAN': { lat: 23.3924, lon: 113.2988, name: 'Guangzhou Baiyun' },
  'SHA': { lat: 31.1979, lon: 121.3364, name: 'Shanghai Hongqiao' },
  
  // Middle East
  'DXB': { lat: 25.2532, lon: 55.3657, name: 'Dubai International' },
  'DOH': { lat: 25.2731, lon: 51.6080, name: 'Doha Hamad International' },
  'AUH': { lat: 24.4330, lon: 54.6511, name: 'Abu Dhabi International' },
  'CAI': { lat: 30.1219, lon: 31.4056, name: 'Cairo International' },
  'TLV': { lat: 32.0114, lon: 34.8867, name: 'Tel Aviv Ben Gurion' },
  
  // South America
  'GRU': { lat: -23.4356, lon: -46.4731, name: 'São Paulo Guarulhos' },
  'GIG': { lat: -22.8099, lon: -43.2505, name: 'Rio de Janeiro Galeão' },
  'SCL': { lat: -33.3930, lon: -70.7858, name: 'Santiago International' },
  'BOG': { lat: 4.7016, lon: -74.1469, name: 'Bogotá El Dorado' },
  'LIM': { lat: -12.0219, lon: -77.1143, name: 'Lima Jorge Chávez' },
  'EZE': { lat: -34.8222, lon: -58.5358, name: 'Buenos Aires Ezeiza' },
  
  // Africa
  'JNB': { lat: -26.1392, lon: 28.2460, name: 'Johannesburg OR Tambo' },
  'CPT': { lat: -33.9715, lon: 18.6021, name: 'Cape Town International' },
  'NBO': { lat: -1.3192, lon: 36.9278, name: 'Nairobi Jomo Kenyatta' },
  'ADD': { lat: 8.9779, lon: 38.7992, name: 'Addis Ababa Bole' },
};

export const getAirport = (code: string) => {
  return airports[code.toUpperCase()] ?? null;
};

export const getAirportCoords = (code: string): AirportCoordinates | null => {
  const airport = airports[code.toUpperCase()];
  if (airport) {
    return { lat: airport.lat, lon: airport.lon };
  }
  console.warn(`Airport code ${code} not found in database`);
  return null;
};
