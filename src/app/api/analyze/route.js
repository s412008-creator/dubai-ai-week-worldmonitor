import { GoogleGenerativeAI } from '@google/generative-ai';
export const runtime = 'edge';

// Initialize Gemini API (Make sure process.env.GEMINI_API_KEY is set in .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key");

export async function POST(req) {
  try {
    const { foodInput, mockData } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      // Return a mock response if no API key is provided (for demo purposes)
      console.log("No Gemini API key, using mock response.");
      return new Response(JSON.stringify({
        summary: { totalCalories: 15000, edibleItems: 2, inedibleItems: 1 },
        edible: [
          {
            item: "Leftover Rice & Vegetables",
            calories: 12000,
            macros: { protein: "50g", carbs: "2000g", fat: "100g" },
            destination: mockData.shelters[0].name,
            reason: "High carb meal suitable for energy, sent to highest population shelter."
          }
        ],
        inedible: [
          {
            item: "Spoiled Milk",
            destination: mockData.powerPlants[0].name,
            reason: "Spoiled dairy can be used for biogas generation."
          }
        ]
      }), { status: 200 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an AI for the Dubai AI Week Sustainable Food Distribution project.
    Your task is to analyze the following surplus food list: "${foodInput}".
    
    Classify each item as either 'edible' or 'inedible'.
    For edible items:
    - Estimate the total calories and macronutrients (protein, carbs, fat).
    - Match it to one of these homeless shelters for healthy calorie distribution: ${JSON.stringify(mockData.shelters)}. Prioritize shelters with higher population or specific needs.
    
    For inedible items:
    - Route it to either a Biomass Power Plant or a Composting/Pig Farm based on suitability:
    Power Plants: ${JSON.stringify(mockData.powerPlants)}
    Farms/Compost: ${JSON.stringify(mockData.farms)}
    
    Respond STRICTLY in the following JSON format without any markdown wrappers or code blocks:
    {
      "summary": {
        "totalCalories": number,
        "edibleItems": number,
        "inedibleItems": number
      },
      "edible": [
        {
          "item": "string",
          "calories": number,
          "macros": { "protein": "string", "carbs": "string", "fat": "string" },
          "destination": "string",
          "reason": "string"
        }
      ],
      "inedible": [
        {
          "item": "string",
          "destination": "string",
          "reason": "string"
        }
      ]
    }
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    
    // Clean up potential markdown formatting from Gemini
    if (textResponse.startsWith('\`\`\`json')) {
      textResponse = textResponse.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }

    const parsedData = JSON.parse(textResponse);

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
