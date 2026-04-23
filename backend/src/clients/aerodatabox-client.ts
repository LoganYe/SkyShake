import type { BackendConfig } from '../config.js';
import type { FlightDataPayload } from '../contracts.js';
import {
  ConfigurationError,
  RateLimitError,
  UpstreamServiceError,
} from '../errors.js';

import type { FlightDataProvider } from './flight-lookup-provider.js';

interface FetchLike {
  (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
}

const RAPIDAPI_BASE_URL = 'https://aerodatabox.p.rapidapi.com';
const RAPIDAPI_HOST = 'aerodatabox.p.rapidapi.com';
const APIMARKET_BASE_URL = 'https://prod.api.market/api/v1/aedbx/aerodatabox';

export class AeroDataBoxClient implements FlightDataProvider {
  constructor(
    private readonly config: BackendConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async lookupFlight(
    flightNumber: string,
    flightDate?: string,
    flightTime?: string,
  ): Promise<FlightDataPayload | null> {
    if (this.config.flightProvider !== 'aerodatabox') {
      throw new ConfigurationError(
        'Flight lookup is disabled because FLIGHT_PROVIDER is not set to aerodatabox.',
        { provider: this.config.flightProvider },
      );
    }

    if (!this.config.aeroDataBox.apiKey) {
      throw new ConfigurationError(
        'Flight lookup is disabled because AERODATABOX_API_KEY is missing.',
        { provider: 'aerodatabox' },
      );
    }

    const normalizedFlightNumber = normalizeLookupValue(flightNumber);
    const { url, headers } = buildLookupRequest(
      this.config,
      this.config.aeroDataBox.apiKey,
      normalizedFlightNumber,
      flightDate,
    );

    const response = await this.fetchImpl(url, { headers });
    if (response.status === 204) {
      return null;
    }

    const { payload, rawText } = await readResponseBody(response);
    if (response.status === 404 && looksLikeNotFound(payload, rawText)) {
      return null;
    }

    if (response.status === 401 || response.status === 403) {
      throw new UpstreamServiceError(
        buildErrorMessage(
          `AeroDataBox authentication failed with HTTP ${response.status}.`,
          payload,
          rawText,
        ),
        {
          code: 'provider_auth_failed',
          provider: 'aerodatabox',
        },
      );
    }

    if (response.status === 429) {
      throw new RateLimitError(
        buildErrorMessage(
          'AeroDataBox rate limit exceeded.',
          payload,
          rawText,
        ),
        {
          provider: 'aerodatabox',
          retryAfterSeconds: parseRetryAfterSeconds(
            response.headers.get('retry-after'),
          ),
        },
      );
    }

    if (!response.ok) {
      throw new UpstreamServiceError(
        buildErrorMessage(
          `AeroDataBox request failed with HTTP ${response.status}.`,
          payload,
          rawText,
        ),
        {
          code: 'provider_request_failed',
          provider: 'aerodatabox',
        },
      );
    }

    if (!Array.isArray(payload)) {
      throw new UpstreamServiceError(
        'AeroDataBox returned an invalid response.',
        {
          code: 'provider_payload_invalid',
          provider: 'aerodatabox',
        },
      );
    }

    const selectedFlight = pickBestFlight(
      payload,
      normalizedFlightNumber,
      flightDate,
      flightTime,
    );
    return selectedFlight
      ? normalizeFlight(selectedFlight, normalizedFlightNumber)
      : null;
  }

  async searchFlightsByRoute(
    departureCode: string,
    arrivalCode: string,
    departureLocal: string,
  ): Promise<FlightDataPayload[]> {
    if (this.config.flightProvider !== 'aerodatabox') {
      throw new ConfigurationError(
        'Route-based flight discovery is disabled because FLIGHT_PROVIDER is not set to aerodatabox.',
        { provider: this.config.flightProvider },
      );
    }

    if (!this.config.aeroDataBox.apiKey) {
      throw new ConfigurationError(
        'Route-based flight discovery is disabled because AERODATABOX_API_KEY is missing.',
        { provider: 'aerodatabox' },
      );
    }

    const normalizedDeparture = normalizeAirportCode(departureCode);
    const normalizedArrival = normalizeAirportCode(arrivalCode);
    const { fromLocal, toLocal } = buildAirportSearchWindow(departureLocal);
    const { url, headers } = buildAirportLookupRequest(
      this.config,
      this.config.aeroDataBox.apiKey,
      normalizedDeparture,
      fromLocal,
      toLocal,
    );

    const response = await this.fetchImpl(url, { headers });
    const { payload, rawText } = await readResponseBody(response);

    if (response.status === 401 || response.status === 403) {
      throw new UpstreamServiceError(
        buildErrorMessage(
          `AeroDataBox authentication failed with HTTP ${response.status}.`,
          payload,
          rawText,
        ),
        {
          code: 'provider_auth_failed',
          provider: 'aerodatabox',
        },
      );
    }

    if (response.status === 429) {
      throw new RateLimitError(
        buildErrorMessage(
          'AeroDataBox rate limit exceeded.',
          payload,
          rawText,
        ),
        {
          provider: 'aerodatabox',
          retryAfterSeconds: parseRetryAfterSeconds(
            response.headers.get('retry-after'),
          ),
        },
      );
    }

    if (!response.ok) {
      throw new UpstreamServiceError(
        buildErrorMessage(
          `AeroDataBox request failed with HTTP ${response.status}.`,
          payload,
          rawText,
        ),
        {
          code: 'provider_request_failed',
          provider: 'aerodatabox',
        },
      );
    }

    if (!isRecord(payload)) {
      throw new UpstreamServiceError(
        'AeroDataBox returned an invalid airport flights response.',
        {
          code: 'provider_payload_invalid',
          provider: 'aerodatabox',
        },
      );
    }

    const departures = Array.isArray(payload.departures) ? payload.departures : [];

    return departures
      .filter(isRecord)
      .filter((entry) => !isCargoFlight(entry))
      .filter(
        (entry) =>
          extractDestinationCode(entry)?.toUpperCase() === normalizedArrival,
      )
      .sort(
        (left, right) =>
          candidateEntrySortKey(left, departureLocal) -
          candidateEntrySortKey(right, departureLocal),
      )
      .map((entry) => normalizeAirportFlight(entry, normalizedDeparture))
      .slice(0, 8);
  }
}

function buildLookupRequest(
  config: BackendConfig,
  apiKey: string,
  normalizedFlightNumber: string,
  flightDate?: string,
) {
  const pathSegments = ['flights', 'Number', normalizedFlightNumber];
  if (flightDate) {
    pathSegments.push(flightDate);
  }

  const baseUrl =
    config.aeroDataBox.marketplace === 'rapidapi'
      ? RAPIDAPI_BASE_URL
      : APIMARKET_BASE_URL;
  const pathname = pathSegments.map(encodeURIComponent).join('/');
  const url = new URL(`${baseUrl}/${pathname}`);
  let headers: Record<string, string>;

  url.searchParams.set('dateLocalRole', 'Both');
  url.searchParams.set('withLocation', 'true');
  url.searchParams.set(
    'withFlightPlan',
    config.aeroDataBox.enableFlightPlan ? 'true' : 'false',
  );

  if (config.aeroDataBox.marketplace === 'rapidapi') {
    headers = {
      Accept: 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': config.aeroDataBox.host ?? RAPIDAPI_HOST,
    };
  } else if (config.aeroDataBox.marketplace === 'apimarket') {
    headers = {
      Accept: 'application/json',
      'x-magicapi-key': apiKey,
    };
  } else {
    throw new ConfigurationError(
      `Unsupported AeroDataBox marketplace "${config.aeroDataBox.marketplace}".`,
    );
  }

  return { url, headers };
}

function buildAirportLookupRequest(
  config: BackendConfig,
  apiKey: string,
  departureCode: string,
  fromLocal: string,
  toLocal: string,
) {
  const baseUrl =
    config.aeroDataBox.marketplace === 'rapidapi'
      ? RAPIDAPI_BASE_URL
      : APIMARKET_BASE_URL;
  const pathname = [
    'flights',
    'airports',
    'iata',
    departureCode,
    fromLocal,
    toLocal,
  ]
    .map(encodeURIComponent)
    .join('/');
  const url = new URL(`${baseUrl}/${pathname}`);
  let headers: Record<string, string>;

  url.searchParams.set('withLocation', 'false');

  if (config.aeroDataBox.marketplace === 'rapidapi') {
    headers = {
      Accept: 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': config.aeroDataBox.host ?? RAPIDAPI_HOST,
    };
  } else if (config.aeroDataBox.marketplace === 'apimarket') {
    headers = {
      Accept: 'application/json',
      'x-magicapi-key': apiKey,
    };
  } else {
    throw new ConfigurationError(
      `Unsupported AeroDataBox marketplace "${config.aeroDataBox.marketplace}".`,
    );
  }

  return { url, headers };
}

async function readResponseBody(response: Response) {
  const rawText = await response.text();
  if (rawText.trim().length === 0) {
    return {
      rawText,
      payload: null,
    };
  }

  try {
    return {
      rawText,
      payload: JSON.parse(rawText) as unknown,
    };
  } catch {
    return {
      rawText,
      payload: null,
    };
  }
}

function looksLikeNotFound(payload: unknown, rawText: string) {
  const message = extractErrorMessage(payload, rawText)?.toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes('not found') ||
    message.includes('no flight') ||
    message.includes('no data')
  );
}

function pickBestFlight(
  data: unknown[],
  normalizedFlightNumber: string,
  flightDate?: string,
  flightTime?: string,
) {
  const candidates = data
    .filter(isRecord)
    .map((entry) => ({
      entry,
      score: scoreFlightCandidate(
        entry,
        normalizedFlightNumber,
        flightDate,
        flightTime,
      ),
    }))
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.entry ?? null;
}

function scoreFlightCandidate(
  entry: Record<string, unknown>,
  normalizedFlightNumber: string,
  flightDate?: string,
  flightTime?: string,
) {
  const departure = isRecord(entry.departure) ? entry.departure : {};
  const arrival = isRecord(entry.arrival) ? entry.arrival : {};
  const status = stringOrNull(entry.status);
  const codeshareStatus = stringOrNull(entry.codeshareStatus);

  let score = 0;

  if (normalizeLookupValue(stringOrNull(entry.number)) === normalizedFlightNumber) {
    score += 1_000;
  }

  if (flightDate && matchesFlightDate(departure, arrival, flightDate)) {
    score += 120;
  }

  if (flightDate && flightTime) {
    score += departureLocalTimeRank(departure, flightDate, flightTime);
  }

  score += statusRank(status);
  score += codeshareRank(codeshareStatus);

  if (hasLocation(entry)) {
    score += 20;
  }

  if (hasLiveMovement(departure) || hasLiveMovement(arrival)) {
    score += 12;
  }

  if (airportCode(departure) != null && airportCode(arrival) != null) {
    score += 6;
  }

  if (hasDateTime(departure) || hasDateTime(arrival)) {
    score += 4;
  }

  return score;
}

function matchesFlightDate(
  departure: Record<string, unknown>,
  arrival: Record<string, unknown>,
  flightDate: string,
) {
  const movementDates = [
    extractLocalDate(departure),
    extractLocalDate(arrival),
  ].filter((value): value is string => value != null);

  return movementDates.includes(flightDate);
}

function extractLocalDate(movement: Record<string, unknown>) {
  const dateValue =
    dateTimeValue(movement.revisedTime, 'local') ??
    dateTimeValue(movement.scheduledTime, 'local') ??
    dateTimeValue(movement.predictedTime, 'local') ??
    dateTimeValue(movement.runwayTime, 'local');

  return dateValue?.slice(0, 10) ?? null;
}

function normalizeFlight(
  entry: Record<string, unknown>,
  normalizedFlightNumber: string,
): FlightDataPayload {
  const departure = isRecord(entry.departure) ? entry.departure : {};
  const arrival = isRecord(entry.arrival) ? entry.arrival : {};
  const airline = isRecord(entry.airline) ? entry.airline : {};
  const aircraft = isRecord(entry.aircraft) ? entry.aircraft : {};
  const location = isRecord(entry.location) ? entry.location : {};

  return {
    flightNumber:
      normalizeLookupValue(stringOrNull(entry.number)) || normalizedFlightNumber,
    airline: stringOrNull(airline.name) ?? 'Unknown airline',
    departure: airportCode(departure) ?? 'N/A',
    departureAirport: airportName(departure),
    arrival: airportCode(arrival) ?? 'N/A',
    arrivalAirport: airportName(arrival),
    departureTime: movementTime(departure),
    arrivalTime: movementTime(arrival),
    aircraft:
      stringOrNull(aircraft.model) ??
      stringOrNull(aircraft.reg) ??
      stringOrNull(aircraft.modeS) ??
      'Unknown aircraft',
    status: stringOrNull(entry.status) ?? 'Unknown',
    latitude: toNumber(location.lat),
    longitude: toNumber(location.lon),
    altitude: nestedNumber(location.altitude, 'feet'),
    velocity: nestedNumber(location.groundSpeed, 'kmPerHour'),
    isMockData: false,
    error: null,
  };
}

function movementTime(movement: Record<string, unknown>) {
  const rawValue =
    dateTimeValue(movement.revisedTime, 'utc') ??
    dateTimeValue(movement.runwayTime, 'utc') ??
    dateTimeValue(movement.predictedTime, 'utc') ??
    dateTimeValue(movement.scheduledTime, 'utc');

  return normalizeDateTimeString(rawValue);
}

function airportCode(movement: Record<string, unknown>) {
  const airport = isRecord(movement.airport) ? movement.airport : {};
  return stringOrNull(airport.iata) ?? stringOrNull(airport.icao);
}

function airportName(movement: Record<string, unknown>) {
  const airport = isRecord(movement.airport) ? movement.airport : {};
  return stringOrNull(airport.name);
}

function hasLocation(entry: Record<string, unknown>) {
  const location = isRecord(entry.location) ? entry.location : {};
  return toNumber(location.lat) != null && toNumber(location.lon) != null;
}

function hasLiveMovement(movement: Record<string, unknown>) {
  return qualityIncludes(movement, 'Live');
}

function hasDateTime(movement: Record<string, unknown>) {
  return movementTime(movement) != null;
}

function qualityIncludes(movement: Record<string, unknown>, token: string) {
  if (!Array.isArray(movement.quality)) {
    return false;
  }

  return movement.quality.some(
    (entry) => typeof entry === 'string' && entry.toLowerCase() === token.toLowerCase(),
  );
}

function dateTimeValue(value: unknown, field: 'utc' | 'local') {
  if (!isRecord(value)) {
    return null;
  }

  return stringOrNull(value[field]);
}

function nestedNumber(value: unknown, field: string) {
  if (!isRecord(value)) {
    return null;
  }

  return toNumber(value[field]);
}

function extractErrorMessage(payload: unknown, rawText: string) {
  if (isRecord(payload)) {
    const message = stringOrNull(payload.message);
    if (message) {
      return message;
    }
  }

  return rawText.trim().length > 0 ? rawText.trim() : null;
}

function buildErrorMessage(
  baseMessage: string,
  payload: unknown,
  rawText: string,
) {
  const providerMessage = extractErrorMessage(payload, rawText);
  return providerMessage ? `${baseMessage} ${providerMessage}` : baseMessage;
}

function parseRetryAfterSeconds(value: string | null) {
  if (!value) {
    return null;
  }

  const parsedSeconds = Number(value);
  if (Number.isFinite(parsedSeconds) && parsedSeconds >= 0) {
    return Math.ceil(parsedSeconds);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const deltaMs = parsedDate.getTime() - Date.now();
  if (deltaMs <= 0) {
    return null;
  }

  return Math.ceil(deltaMs / 1000);
}

function statusRank(status: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'enroute':
    case 'approaching':
      return 80;
    case 'departed':
    case 'boarding':
    case 'gateclosed':
      return 70;
    case 'expected':
    case 'delayed':
    case 'checkin':
      return 60;
    case 'arrived':
      return 50;
    case 'diverted':
      return 20;
    case 'unknown':
      return 10;
    case 'canceled':
    case 'canceleduncertain':
      return 0;
    default:
      return 5;
  }
}

function codeshareRank(status: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'isoperator':
      return 15;
    case 'unknown':
      return 5;
    case 'iscodeshared':
      return 0;
    default:
      return 0;
  }
}

function normalizeLookupValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return value.replace(/\s+/g, '').toUpperCase();
}

function departureLocalTimeRank(
  departure: Record<string, unknown>,
  flightDate: string,
  flightTime: string,
) {
  const localValue =
    dateTimeValue(departure.revisedTime, 'local') ??
    dateTimeValue(departure.predictedTime, 'local') ??
    dateTimeValue(departure.runwayTime, 'local') ??
    dateTimeValue(departure.scheduledTime, 'local');

  if (!localValue) {
    return 0;
  }

  const selected = parseWallClockLocal(`${flightDate}T${flightTime}`);
  const candidate = parseWallClockLocal(localValue);
  const deltaMinutes = Math.abs(candidate.getTime() - selected.getTime()) / 60_000;

  if (!Number.isFinite(deltaMinutes)) {
    return 0;
  }

  if (deltaMinutes <= 30) {
    return 90;
  }
  if (deltaMinutes <= 60) {
    return 70;
  }
  if (deltaMinutes <= 120) {
    return 40;
  }
  if (deltaMinutes <= 240) {
    return 10;
  }

  return 0;
}

function normalizeAirportCode(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? '';
}

function buildAirportSearchWindow(departureLocal: string) {
  const base = parseWallClockLocal(departureLocal);
  const from = new Date(base.getTime() - 3 * 60 * 60 * 1000);
  const to = new Date(base.getTime() + 3 * 60 * 60 * 1000);
  return {
    fromLocal: formatAirportLocalDateTime(from),
    toLocal: formatAirportLocalDateTime(to),
  };
}

function normalizeDateTimeString(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatAirportLocalDateTime(value: Date) {
  const year = value.getFullYear().toString().padStart(4, '0');
  const month = (value.getMonth() + 1).toString().padStart(2, '0');
  const day = value.getDate().toString().padStart(2, '0');
  const hour = value.getHours().toString().padStart(2, '0');
  const minute = value.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseWallClockLocal(value: string) {
  const normalized = value.replace(' ', 'T').slice(0, 16);
  const [datePart, timePart] = normalized.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function isCargoFlight(value: Record<string, unknown>) {
  return value.isCargo === true;
}

function extractDestinationCode(value: Record<string, unknown>) {
  const movement = isRecord(value.movement) ? value.movement : {};
  return airportCode(movement);
}

function normalizeAirportFlight(
  entry: Record<string, unknown>,
  departureCode: string,
): FlightDataPayload {
  const movement = isRecord(entry.movement) ? entry.movement : {};
  const airline = isRecord(entry.airline) ? entry.airline : {};
  const aircraft = isRecord(entry.aircraft) ? entry.aircraft : {};
  const arrival = isRecord(entry.arrival) ? entry.arrival : {};

  return {
    flightNumber:
      normalizeLookupValue(stringOrNull(entry.number)) || 'Unknown',
    airline: stringOrNull(airline.name) ?? 'Unknown airline',
    departure: departureCode,
    departureAirport: null,
    arrival: airportCode(movement) ?? 'N/A',
    arrivalAirport: airportName(movement),
    departureTime: movementTime(movement),
    arrivalTime: movementTime(arrival),
    aircraft:
      stringOrNull(aircraft.model) ??
      stringOrNull(aircraft.reg) ??
      stringOrNull(aircraft.modeS) ??
      'Unknown aircraft',
    status: stringOrNull(entry.status) ?? 'Unknown',
    latitude: null,
    longitude: null,
    altitude: null,
    velocity: null,
    isMockData: false,
    error: null,
  };
}

function candidateEntrySortKey(
  entry: Record<string, unknown>,
  departureLocal: string,
) {
  const movement = isRecord(entry.movement) ? entry.movement : {};
  const scheduled =
    dateTimeValue(movement.scheduledTime, 'local') ??
    dateTimeValue(movement.revisedTime, 'local') ??
    dateTimeValue(movement.predictedTime, 'local') ??
    dateTimeValue(movement.runwayTime, 'local');

  if (!scheduled) {
    return Number.POSITIVE_INFINITY;
  }

  const selected = parseWallClockLocal(departureLocal);
  const scheduledLocal = parseWallClockLocal(scheduled);
  return Math.abs(scheduledLocal.getTime() - selected.getTime());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}
