import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(repositoryRoot, 'shared', 'airport-catalog.json');
const typescriptPath = join(repositoryRoot, 'backend', 'src', 'airport-catalog.ts');
const dartPath = join(repositoryRoot, 'lib', 'src', 'core', 'airport_catalog.dart');
const checkOnly = process.argv.includes('--check');

const airports = validateCatalog(JSON.parse(await readFile(sourcePath, 'utf8')));
await writeOrCheck(typescriptPath, renderTypescript(airports));
await writeOrCheck(dartPath, renderDart(airports));

function validateCatalog(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Airport catalog must be a non-empty JSON array.');
  }

  const codes = new Set();
  return value.map((airport, index) => {
    if (airport == null || typeof airport !== 'object' || Array.isArray(airport)) {
      throw new Error(`Airport at index ${index} must be an object.`);
    }
    const { code, name, latitude, longitude } = airport;
    if (typeof code !== 'string' || !/^[A-Z]{3,4}$/.test(code)) {
      throw new Error(`Airport at index ${index} has invalid code ${JSON.stringify(code)}.`);
    }
    if (codes.has(code)) {
      throw new Error(`Airport code ${code} is duplicated.`);
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error(`Airport ${code} has an invalid name.`);
    }
    if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error(`Airport ${code} has invalid latitude ${latitude}.`);
    }
    if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      throw new Error(`Airport ${code} has invalid longitude ${longitude}.`);
    }
    codes.add(code);
    return { code, name, latitude, longitude };
  });
}

function renderTypescript(airports) {
  const records = airports
    .map(
      (airport) => `  {
    code: ${JSON.stringify(airport.code)},
    name: ${JSON.stringify(airport.name)},
    latitude: ${airport.latitude},
    longitude: ${airport.longitude},
  },`,
    )
    .join('\n');

  return `// GENERATED FILE. Edit shared/airport-catalog.json, then run npm run generate:airports.
export interface AirportRecord {
  readonly code: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
}

export const airportList: readonly AirportRecord[] = [
${records}
];

export const airportCatalog: Readonly<Record<string, AirportRecord>> =
  Object.freeze(
    Object.fromEntries(airportList.map((airport) => [airport.code, airport])),
  );

export function lookupAirport(code: string): AirportRecord | undefined {
  return airportCatalog[code.trim().toUpperCase()];
}
`;
}

function renderDart(airports) {
  const records = airports
    .map(
      (airport) => `    '${escapeDart(airport.code)}': AirportRecord(
      code: '${escapeDart(airport.code)}',
      name: '${escapeDart(airport.name)}',
      latitude: ${dartNumber(airport.latitude)},
      longitude: ${dartNumber(airport.longitude)},
    ),`,
    )
    .join('\n');

  return `// GENERATED FILE. Edit shared/airport-catalog.json, then run npm run generate:airports.
class AirportRecord {
  const AirportRecord({
    required this.code,
    required this.name,
    required this.latitude,
    required this.longitude,
  });

  final String code;
  final String name;
  final double latitude;
  final double longitude;
}

class AirportCatalog {
  static const Map<String, AirportRecord> airports = {
${records}
  };

  static AirportRecord? lookup(String code) {
    return airports[code.trim().toUpperCase()];
  }
}
`;
}

function escapeDart(value) {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function dartNumber(value) {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

async function writeOrCheck(path, expected) {
  if (!checkOnly) {
    await writeFile(path, expected);
    return;
  }

  const actual = await readFile(path, 'utf8');
  if (actual !== expected) {
    throw new Error(
      `${path} is out of date. Run npm run generate:airports from backend/.`,
    );
  }
}
