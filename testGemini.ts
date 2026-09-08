import dotenv from "dotenv";
dotenv.config();

import { GoogleGenAI } from "@google/genai";

async function main() {
    console.log("API Key Loaded:", !!process.env.GEMINI_API_KEY);
    console.log("Model:", process.env.GEMINI_MODEL);

    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!
    });

    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        contents: "Say hello."
    });

    console.log(response.text);
}

main().catch(console.error);