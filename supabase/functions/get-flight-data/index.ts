import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const { flightNumber } = await req.json();
    
    if (!flightNumber) {
      throw new Error('Flight number is required');
    }

    console.log('Fetching flight data for:', flightNumber);

    // AeroDataBox API via RapidAPI - Reliable flight data
    // Endpoint: Search flights by flight number
    const today = new Date().toISOString().split('T')[0];
    const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNumber}/${today}`;
    
    console.log('Calling AeroDataBox API for flight:', flightNumber);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': rapidApiKey || '',
          'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('AeroDataBox API fetch error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AeroDataBox API timeout or network error: ${errorMsg}`);
    }
    
    if (!response.ok) {
      console.error('AeroDataBox API error, status:', response.status);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      // Return a not-found response instead of throwing an error
      if (response.status === 404) {
        return new Response(JSON.stringify({
          flightNumber: flightNumber,
          airline: flightNumber.substring(0, 2),
          departure: 'N/A',
          arrival: 'N/A',
          departureTime: new Date().toISOString(),
          arrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          aircraft: 'Unknown',
          status: 'not found',
          latitude: null,
          longitude: null,
          altitude: null,
          velocity: null,
          isMockData: true,
          error: `Flight ${flightNumber} not found for today (${today}). The flight may not be scheduled today.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AeroDataBox API returned status: ${response.status}`);
    }

    // Safely parse JSON response
    let data;
    const responseText = await response.text();
    
    // Check if response is empty
    if (!responseText || responseText.trim() === '') {
      console.log('Empty response from AeroDataBox API for:', flightNumber);
      return new Response(JSON.stringify({
        flightNumber: flightNumber,
        airline: flightNumber.substring(0, 2),
        departure: 'N/A',
        arrival: 'N/A',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        aircraft: 'Unknown',
        status: 'not found',
        latitude: null,
        longitude: null,
        altitude: null,
        velocity: null,
        isMockData: true,
        error: `Flight ${flightNumber} not found. The API returned an empty response.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText.substring(0, 200));
      console.error('Parse error:', parseError);
      return new Response(JSON.stringify({
        flightNumber: flightNumber,
        airline: flightNumber.substring(0, 2),
        departure: 'N/A',
        arrival: 'N/A',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        aircraft: 'Unknown',
        status: 'not found',
        latitude: null,
        longitude: null,
        altitude: null,
        velocity: null,
        isMockData: true,
        error: `Flight ${flightNumber} not found. Invalid response from API.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('AeroDataBox response received, flights found:', data.length || 0);
    
    if (!data || data.length === 0) {
      console.log('No flight found in AeroDataBox API for:', flightNumber);
      return new Response(JSON.stringify({
        flightNumber: flightNumber,
        airline: flightNumber.substring(0, 2),
        departure: 'N/A',
        arrival: 'N/A',
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        aircraft: 'Unknown',
        status: 'not found',
        latitude: null,
        longitude: null,
        altitude: null,
        velocity: null,
        isMockData: true,
        error: `Flight ${flightNumber} not found for today (${today}). The flight may not be scheduled today.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the first flight from results
    const flight = data[0];
    
    // Extract flight information
    const flightData = {
      flightNumber: flight.number || flightNumber,
      airline: flight.airline?.name || flightNumber.substring(0, 2),
      departure: flight.departure?.airport?.iata || 'N/A',
      departureAirport: flight.departure?.airport?.name || 'Unknown',
      arrival: flight.arrival?.airport?.iata || 'N/A',
      arrivalAirport: flight.arrival?.airport?.name || 'Unknown',
      departureTime: flight.departure?.scheduledTime?.local || flight.departure?.scheduledTime?.utc || new Date().toISOString(),
      arrivalTime: flight.arrival?.scheduledTime?.local || flight.arrival?.scheduledTime?.utc || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      aircraft: flight.aircraft?.model || 'Unknown',
      status: flight.status || 'scheduled',
      // Live position data (if available)
      latitude: flight.movement?.airport?.location?.lat || null,
      longitude: flight.movement?.airport?.location?.lon || null,
      altitude: null, // Not available in basic endpoint
      velocity: null, // Not available in basic endpoint
      isMockData: false
    };

    console.log('Returning real flight data from AeroDataBox:', flightData);

    return new Response(JSON.stringify(flightData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-flight-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Failed to fetch flight data from AeroDataBox'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});