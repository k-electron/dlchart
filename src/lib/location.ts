import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface LocationData {
  lat: number;
  lng: number;
  timezone: string;
  formattedAddress: string;
}

export async function resolveLocation(query: string): Promise<LocationData> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Resolve the following location query into latitude, longitude, and IANA timezone identifier. If it's a zip code, provide the coordinates for that zip code. If it's an address, provide the coordinates. Query: "${query}"`,
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
