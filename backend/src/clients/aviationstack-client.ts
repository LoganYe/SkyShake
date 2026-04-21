import type { BackendConfig } from '../config.js';
import type { FlightDataPayload } from '../contracts.js';
import { ConfigurationError, UpstreamServiceError } from '../errors.js';

interface FetchLike {
  (input: URL | RequestInfo, init?: RequestInit): Promise<Response>;
}

export class AviationStackClient {
  constructor(
    private readonly config: BackendConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async lookupFlight(
    flightNumber: string,
    flightDate?: string,
  ): Promise<FlightDataPayload | null> {
    if (this.config.flightProvider !== 'aviationstack') {
      throw new ConfigurationError(
        'Flight lookup is disabled because FLIGHT_PROVIDER is not set to aviationstack.',
      );
    }

    if (!this.config.aviationStackAccessKey) {
      throw new ConfigurationError(
        'Flight lookup is disabled because AVIATIONSTACK_ACCESS_KEY is missing.',
      );
    }

    const normalizedFlightNumber = flightNumber.trim().toUpperCase();
    const url = new URL('https://api.aviationstack.com/v1/flights');
    url.searchParams.set('access_key', this.config.aviationStackAccessKey);
    url.searchParams.set('flight_iata', normalizedFlightNumber);
    url.searchParams.set('limit', '10');
    if (flightDate) {
      url.searchParams.set('flight_date', flightDate);
    }

    const response = await this.fetchImpl(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new UpstreamServiceError(
        `Aviationstack request failed with HTTP ${response.status}.`,
      );
    }

    const payload = await response.json();
    if (!isRecord(payload)) {
      throw new UpstreamServiceError('Aviationstack returned an invalid response.');
    }

    if (isRecord(payload.error)) {
      throw new UpstreamServiceError(
        String(payload.error.message ?? 'Aviationstack returned an error.'),
      );
    }

    const data = Array.isArray(payload.data) ? payload.data : [];
    const selectedFlight = pickBestFlight(data, normalizedFlightNumber);
    if (!selectedFlight) {
      return null;
    }

    const departure = isRecord(selectedFlight.departure) ? selectedFlight.departure : {};
    const arrival = isRecord(selectedFlight.arrival) ? selectedFlight.arrival : {};
    const airline = isRecord(selectedFlight.airline) ? selectedFlight.airline : {};
    const flight = isRecord(selectedFlight.flight) ? selectedFlight.flight : {};
    const live = isRecord(selectedFlight.live) ? selectedFlight.live : {};
    const aircraft = isRecord(selectedFlight.aircraft) ? selectedFlight.aircraft : {};

    return {
      flightNumber:
        stringOrNull(flight.iata) ??
        stringOrNull(flight.icao) ??
        normalizedFlightNumber,
      airline: stringOrNull(airline.name) ?? 'Unknown airline',
      departure: stringOrNull(departure.iata) ?? 'N/A',
      departureAirport: stringOrNull(departure.airport),
      arrival: stringOrNull(arrival.iata) ?? 'N/A',
      arrivalAirport: stringOrNull(arrival.airport),
      departureTime: pickDateString(
        departure.estimated,
        departure.scheduled,
        departure.actual,
      ),
      arrivalTime: pickDateString(
        arrival.estimated,
        arrival.scheduled,
        arrival.actual,
      ),
      aircraft:
        stringOrNull(aircraft.icao) ??
        stringOrNull(aircraft.iata) ??
        'Unknown aircraft',
      status: stringOrNull(selectedFlight.flight_status) ?? 'unknown',
      latitude: toNumber(live.latitude),
      longitude: toNumber(live.longitude),
      altitude: toNumber(live.altitude),
      velocity: toNumber(live.speed_horizontal),
      isMockData: false,
      error: null,
    };
  }
}

function pickBestFlight(data: unknown[], normalizedFlightNumber: string) {
  const candidates = data.filter(isRecord);
  const exactMatches = candidates.filter((entry) => {
    const flight = isRecord(entry.flight) ? entry.flight : {};
    const airline = isRecord(entry.airline) ? entry.airline : {};
    const iata = stringOrNull(flight.iata)?.toUpperCase();
    const synthesized = `${stringOrNull(airline.iata) ?? ''}${
      stringOrNull(flight.number) ?? ''
    }`.toUpperCase();
    return iata === normalizedFlightNumber || synthesized === normalizedFlightNumber;
  });

  const ranked = (exactMatches.length > 0 ? exactMatches : candidates).sort((left, right) => {
    const leftStatus = statusRank(stringOrNull(left.flight_status));
    const rightStatus = statusRank(stringOrNull(right.flight_status));
    return leftStatus - rightStatus;
  });

  return ranked[0] ?? null;
}

function statusRank(status: string | null) {
  switch ((status ?? '').toLowerCase()) {
    case 'active':
      return 0;
    case 'scheduled':
      return 1;
    case 'landed':
      return 2;
    default:
      return 3;
  }
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

function pickDateString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return new Date().toISOString();
}
