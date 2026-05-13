import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
export const getSolPrice = async (req, res, next) => {
  try {
    const currency = (req.query.currency || "inr").toLowerCase();
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currency}`,
    );
    const data = await response.json();
    if (data.solana && data.solana[currency]) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            currency: currency.toUpperCase(),
            solPrice: data.solana[currency],
          },
          "SOL price fetched",
        ),
      );
    }
    throw new ApiError(404, `Could not fetch SOL price for ${currency}`);
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(500, "Failed to fetch SOL price"));
  }
};
export const scanBill = async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      throw new ApiError(400, "image (base64) is required");
    }
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You are a receipt/bill scanner. Analyze this image of a receipt or bill and extract the following information in JSON format ONLY. Do not include any markdown formatting, code blocks, or extra text — return ONLY the raw JSON object.
{
  "description": "Brief description of the purchase (e.g., 'Dinner at Pizza Hut', 'Groceries from Walmart')",
  "totalAmount": 0.00,
  "currency": "INR",
  "items": [
    {
      "name": "Item name",
      "quantity": 1,
      "price": 0.00
    }
  ],
  "merchant": "Store/restaurant name if visible",
  "date": "Date if visible (YYYY-MM-DD format)"
}
Rules:
- totalAmount should be the final total including tax/tip if shown
- currency must be a standard 3-letter code (INR, USD, EUR, etc.)
- If you can't read certain details, make your best estimate
- items array should list individual line items if visible
- Return ONLY valid JSON, no markdown, no code blocks, no explanation`;
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
    ]);
    const responseText = result.response.text().trim();
    let parsedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      throw new ApiError(
        500,
        "Could not parse bill details from the image. Please try a clearer photo.",
      );
    }
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          description: parsedData.description || "Scanned Bill",
          totalAmount: Number(parsedData.totalAmount) || 0,
          currency: (parsedData.currency || "INR").toUpperCase(),
          items: parsedData.items || [],
          merchant: parsedData.merchant || "",
          date: parsedData.date || "",
        },
        "Bill scanned successfully",
      ),
    );
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(500, "Failed to scan bill: " + error.message));
  }
};
