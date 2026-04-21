import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenMeteoWeatherData {
  current?: {
    wind_speed_10m?: number;
    wind_gusts_10m?: number;
    temperature_2m?: number;
    cloud_cover?: number;
  };
  hourly?: {
    wind_speed_80m?: number[];
    wind_speed_120m?: number[];
  };
}

// Calculate waypoints along great circle route
function calculateWaypoints(lat1: number, lon1: number, lat2: number, lon2: number, numWaypoints: number = 15) {
  const waypoints = [];
  
  for (let i = 0; i <= numWaypoints; i++) {
    const fraction = i / numWaypoints;
    
    // Convert to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lon1Rad = lon1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lon2Rad = lon2 * Math.PI / 180;
    
    // Great circle interpolation
    const d = 2 * Math.asin(Math.sqrt(
      Math.pow(Math.sin((lat1Rad - lat2Rad) / 2), 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.pow(Math.sin((lon1Rad - lon2Rad) / 2), 2)
    ));
    
    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);
    
    const x = a * Math.cos(lat1Rad) * Math.cos(lon1Rad) + b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
    const y = a * Math.cos(lat1Rad) * Math.sin(lon1Rad) + b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
    const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);
    
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    const lon = Math.atan2(y, x) * 180 / Math.PI;
    
    waypoints.push({ latitude: lat, longitude: lon });
  }
  
  return waypoints;
}

// Enhanced turbulence scoring based on multiple factors
function calculateTurbulenceScore(weatherData: OpenMeteoWeatherData, aircraftType: string = 'A320') {
  const windSpeed = weatherData.current.wind_speed_10m || 0;
  const windGusts = weatherData.current.wind_gusts_10m || 0;
  const windSpeed80m = weatherData.hourly.wind_speed_80m?.[0] || windSpeed;
  const windSpeed120m = weatherData.hourly.wind_speed_120m?.[0] || windSpeed;
  const temperature = weatherData.current.temperature_2m || 15;
  const cloudCover = weatherData.current.cloud_cover || 0;
  
  // Calculate wind shear (change in wind speed with altitude)
  const windShear = Math.abs(windSpeed120m - windSpeed80m) / 40; // Per 40m altitude difference
  
  // Simulate CAPE (Convective Available Potential Energy) based on temperature and cloud cover
  // Higher temperature + high cloud cover suggests convective activity
  const simulatedCAPE = temperature > 20 && cloudCover > 60 
    ? Math.min(3000, (temperature - 20) * 100 + cloudCover * 20)
    : 0;
  
  // Simulate EDR (Eddy Dissipation Rate) - primary turbulence metric
  // Based on wind speed, gusts, and shear
  const gustFactor = windGusts - windSpeed;
  const simulatedEDR = Math.min(0.8, 
    (windSpeed / 100) * 0.3 + 
    (gustFactor / 50) * 0.3 + 
    (windShear / 2) * 0.2
  );
  
  // Base score from EDR (normalized 0-1)
  const baseScore = simulatedEDR;
  
  // Shear factor contribution (0-0.2)
  const shearFactor = Math.min(0.2, windShear * 0.1);
  
  // Convective factor from CAPE (0-0.3)
  const convectiveFactor = Math.min(0.3, simulatedCAPE / 3000);
  
  // Aircraft sensitivity factor (newer aircraft handle turbulence better)
  const aircraftSensitivity = aircraftType.includes('787') || aircraftType.includes('A350') 
    ? -0.05 
    : aircraftType.includes('737') || aircraftType.includes('A320')
    ? 0
    : 0.05;
  
  // Final turbulence score
  const turbulenceScore = Math.max(0, Math.min(1.0, 
    baseScore + shearFactor + convectiveFactor + aircraftSensitivity
  ));
  
  return {
    score: turbulenceScore,
    windSpeed,
    windGusts,
    windShear,
    temperature,
    cloudCover,
    cape: simulatedCAPE,
    edr: simulatedEDR
  };
}

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

    const body = await req.json();
    const { departureLat, departureLon, arrivalLat, arrivalLon, aircraftType } = body;
    
    console.log('Calculating turbulence for route:', { departureLat, departureLon, arrivalLat, arrivalLon });

    // Calculate waypoints along the route
    const waypoints = calculateWaypoints(departureLat, departureLon, arrivalLat, arrivalLon, 15);
    console.log(`Generated ${waypoints.length} waypoints`);

    // Fetch weather data for each waypoint
    const waypointData = await Promise.all(
      waypoints.map(async (waypoint, index) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${waypoint.latitude}&longitude=${waypoint.longitude}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,cloud_cover&hourly=wind_speed_80m,wind_speed_120m,wind_speed_180m&timezone=auto`;
        
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Failed to fetch weather for waypoint ${index}`);
            return null;
          }

          const weatherData = await response.json();
          const turbulence = calculateTurbulenceScore(weatherData, aircraftType || 'A320');
          
          const label = turbulence.score < 0.3 ? 'Smooth' : 
                       turbulence.score < 0.6 ? 'Moderate' : 'Severe';

          return {
            waypoint: index,
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            turbulenceScore: turbulence.score,
            label,
            windSpeed: turbulence.windSpeed,
            windGusts: turbulence.windGusts,
            windShear: turbulence.windShear,
            temperature: turbulence.temperature,
            cloudCover: turbulence.cloudCover,
            cape: turbulence.cape,
            edr: turbulence.edr
          };
        } catch (error) {
          console.error(`Error fetching waypoint ${index}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    const validWaypoints = waypointData.filter(w => w !== null);
    
    // Calculate overall flight turbulence (max score along route)
    const maxTurbulence = validWaypoints.reduce((max, w) => 
      w.turbulenceScore > max ? w.turbulenceScore : max, 0
    );
    
    const averageTurbulence = validWaypoints.reduce((sum, w) => 
      sum + w.turbulenceScore, 0) / validWaypoints.length;

    const overallLabel = maxTurbulence < 0.3 ? 'Smooth' : 
                        maxTurbulence < 0.6 ? 'Moderate' : 'Severe';

    const result = {
      overallScore: maxTurbulence,
      averageScore: averageTurbulence,
      overallLabel,
      waypoints: validWaypoints,
      totalWaypoints: validWaypoints.length
    };

    console.log('Route turbulence analysis complete:', {
      waypoints: result.totalWaypoints,
      maxScore: result.overallScore,
      avgScore: result.averageScore
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-turbulence-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: 'Failed to fetch turbulence data from Open-Meteo'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
