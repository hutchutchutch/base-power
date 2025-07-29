import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface PhotoVerificationResult {
  isCorrectObject: boolean;
  confidence: number;
  detectedObjects: string[];
  errorMessage?: string;
}

export async function verifyPhotoObject(
  base64Image: string, 
  expectedObject: string
): Promise<PhotoVerificationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert object detection AI. Analyze the provided image and determine if it contains the expected object: "${expectedObject}". 
          
          Respond with JSON in this exact format:
          {
            "isCorrectObject": boolean,
            "confidence": number (0-1),
            "detectedObjects": ["object1", "object2", ...],
            "reasoning": "brief explanation of what you see and why it matches or doesn't match"
          }
          
          Be strict in your verification - the object should be clearly visible and be the main subject of the photo. Consider variations in naming (e.g., "cell phone" vs "smartphone", "mobile phone" vs "phone").`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please verify if this image contains a "${expectedObject}". The object should be clearly visible and identifiable.`
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      isCorrectObject: result.isCorrectObject || false,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
      detectedObjects: result.detectedObjects || [],
      errorMessage: result.isCorrectObject ? undefined : result.reasoning
    };
  } catch (error) {
    console.error("OpenAI Vision API error:", error);
    return {
      isCorrectObject: false,
      confidence: 0,
      detectedObjects: [],
      errorMessage: "Failed to analyze image. Please try again."
    };
  }
}
