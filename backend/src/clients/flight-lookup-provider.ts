import type { BackendConfig } from '../config.js';
import type { FlightDataPayload } from '../contracts.js';
import { ConfigurationError } from '../errors.js';

import { AeroDataBoxClient } from './aerodatabox-client.js';

export interface FlightDataProvider {
  lookupFlight(
    flightNumber: string,
    flightDate?: string,
    flightTime?: string,
  ): Promise<FlightDataPayload | null>;

  searchFlightsByRoute(
    departureCode: string,
    arrivalCode: string,
    departureLocal: string,
  ): Promise<FlightDataPayload[]>;
}

export function createFlightDataProvider(
  config: BackendConfig,
): FlightDataProvider {
  switch (config.flightProvider) {
    case 'none':
      return new DisabledFlightDataProvider();
    case 'aerodatabox':
      return new AeroDataBoxClient(config);
  }
}

class DisabledFlightDataProvider implements FlightDataProvider {
  async lookupFlight(): Promise<FlightDataPayload | null> {
    throw new ConfigurationError(
      'Flight lookup is disabled because FLIGHT_PROVIDER is set to none.',
    );
  }

  async searchFlightsByRoute(): Promise<FlightDataPayload[]> {
    throw new ConfigurationError(
      'Route-based flight discovery is disabled because FLIGHT_PROVIDER is set to none.',
    );
  }
}
