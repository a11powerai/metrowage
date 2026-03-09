import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Get Gemini API key from environment variables
 */
export function getGeminiApiKey(): string {
    const envKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '')
        .trim()
        .replace(/["']/g, '');

    if (envKey) {
        return envKey;
    }

    console.warn('No Gemini API key found in Environment variables');
    return '';
}

/**
 * Convert File to base64 string (Node.js server-side)
 */
export async function fileToBase64(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}
