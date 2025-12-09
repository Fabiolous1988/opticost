
import { GoogleGenAI } from "@google/genai";
import { ExternalResearchData } from "../types";
import { STARTING_ADDRESS } from "../constants";

export const performLogisticsResearch = async (
  destinationAddress: string,
  startDate: string
): Promise<ExternalResearchData | null> => {
  if (!process.env.API_KEY || !destinationAddress) {
    return null;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = 'gemini-2.5-flash';

  const prompt = `
    Find specific logistics data for a work trip starting from "${STARTING_ADDRESS}" to "${destinationAddress}".
    The trip starts on date: ${startDate || 'next monday'}.

    I need you to search for and estimate the following 4 values:
    1. Driving Distance (km) one way.
    2. Highway Tolls (Pedaggio Autostradale) cost one way in Euro.
    3. Average price for a decent 3-star hotel/B&B in the destination area (radius 15km) for 1 night (single room with breakfast) on the specified date. Check Booking.com or similar sources via search.
    4. Cost of a Round Trip ticket using Public Transport (Train or Plane + Local Taxi) for 1 person from Verona to the destination.
    
    If the destination is close (within 30km), Public Transport and Hotel might be 0.
    
    Return ONLY a raw JSON object (no markdown formatting) with these keys:
    {
      "distance_km": number,
      "tolls_one_way": number,
      "hotel_avg_price": number,
      "public_transport_return_price": number
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType is NOT supported with googleSearch tools in the current API version
      }
    });

    let text = response.text;
    if (!text) return null;

    // Clean up potential markdown formatting from the LLM response
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Find the first '{' and last '}' to extract JSON if there is extra text
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
    }

    const data = JSON.parse(text);

    return {
      foundDistanceKm: Number(data.distance_km) || 0,
      foundTollCost: Number(data.tolls_one_way) || 0,
      foundHotelCost: Number(data.hotel_avg_price) || 80,
      foundPublicTransportCost: Number(data.public_transport_return_price) || 0,
      lastSearchedAddress: destinationAddress
    };

  } catch (error) {
    console.error("Research Error:", error);
    if (error instanceof Error) {
       console.error(error.message);
    }
    return null;
  }
};
