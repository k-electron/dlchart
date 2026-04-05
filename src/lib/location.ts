import { GoogleGenAI, Type } from "@google/genai";
import tzLookup from 'tz-lookup';

export interface LocationData {
  lat: number;
  lng: number;
  timezone: string;
  formattedAddress: string;
}

export async function resolveLocation(query: string): Promise<LocationData> {
  // Fallback to Nominatim if Gemini API key is missing (e.g. running locally without .env)
  if (!process.env.GEMINI_API_KEY) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
      headers: {
        'User-Agent': 'DaylightGrapher/1.0 (https://ai.studio/build)'
      }
    });
    
    if (!res.ok) throw new Error("Failed to fetch location data.");
    const data = await res.json();
    if (!data || data.length === 0) throw new Error("Location not found. Please try a different query.");
    
    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const timezone = tzLookup(lat, lng);
    
    return {
      lat,
      lng,
      timezone,
      formattedAddress: result.display_name
    };
  }

  // Use Gemini for smart resolution
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Resolve the following location query into latitude, longitude, and IANA timezone identifier. If it's a zip code, assume it is a US zip code unless specified otherwise. If it's an address, provide the coordinates. Query: "${query}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          lat: { type: Type.NUMBER, description: "Latitude" },
          lng: { type: Type.NUMBER, description: "Longitude" },
          timezone: { type: Type.STRING, description: "IANA Timezone Identifier (e.g., America/New_York, Europe/London)" },
          formattedAddress: { type: Type.STRING, description: "Formatted, recognizable address or location name" }
        },
        required: ["lat", "lng", "timezone", "formattedAddress"]
      }
    }
  });
  
  if (!response.text) {
    throw new Error("Failed to resolve location");
  }
  
  return JSON.parse(response.text) as LocationData;
}
