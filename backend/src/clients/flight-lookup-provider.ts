import type { BackendConfig } from '../config.js';
import type { FlightDataPayload } from '../contracts.js';
import { ConfigurationError } from '../errors.js';

import { AeroDataBoxClient } from './aerodatabox-client.js';

export interface FlightLookupProvider {
  lookupFlight(
    flightNumber: string,
    flightDate?: string,
  ): Promise<FlightDataPayload | null>;
}

export function createFlightLookupProvider(
  config: BackendConfig,
): FlightLookupProvider {
  switch (config.flightProvider) {
    case 'none':
      return new DisabledFlightLookupProvider();
    case 'aerodatabox':
      return new AeroDataBoxClient(config);
  }
}

class DisabledFlightLookupProvider implements FlightLookupProvider {
  async lookupFlight(): Promise<FlightDataPayload | null> {
    throw new ConfigurationError(
      'Flight lookup is disabled because FLIGHT_PROVIDER is set to none.',
    );
  }
}
