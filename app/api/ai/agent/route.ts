import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getGeminiApiKey } from "@/lib/gemini";
import { getSessionContext } from "@/lib/session-utils";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userPermissions = (session?.user as any)?.permissions || [];
    const hasAccess = userRole === "SuperAdmin" || userPermissions.includes("ai.use");

    if (!session || !hasAccess) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { prompt, image, context } = await req.json();

        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key not configured" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Fetch essential database records for the context
        const locationFilter = context?.location || session.user.location;
        let whereClause = {};

        if (locationFilter && locationFilter !== "All") {
            const loc = await prisma.location.findFirst({
                where: { name: locationFilter }
            });
            if (loc) {
                whereClause = { locationId: loc.id };
            }
        }

        const workers = await prisma.worker.findMany({
            where: { ...whereClause, status: "Active" },
            include: { location: true }
        });

        // Get basic products config
        const activeProducts = await prisma.product.findMany({});

        const systemPrompt = `
You are the Metrowage AI Assistant. 
Your goal is to parse text, requests, and screenshots to help Admins query data and propose actionable updates to the database.

### 1. KNOWN ENTITIES 
Use these to understand the context of the user's queries or image uploads.
- **Workers**: ${workers.map(w => `"${w.name}" (ID: ${w.id}, Employee ID: ${w.workerId}, Loc: ${w.location?.name})`).join(", ")}
- **Products**: ${activeProducts.map(p => `"${p.model} ${p.name}" (ID: ${p.id}, Category: ${p.category})`).join(", ")}

### 2. HANDLING QUERIES
**A) Informational Queries**:
- If the user asks "How many workers do I have?", answer using the entities list.
- If the user asks "What are the models inside [category]?", find it and answer.

**B) Action Queries (Requires executing a change)**:
- If the user asks to "add a new worker", "create a location", "log attendance", or uploads a screenshot of a spreadsheet/list that implies new data entry:
- Parse the intent/data and propose an array of actions.

### 3. ACTION TYPES YOU CAN SUGGEST
- \`CREATE_WORKER\`: { name, workerId, locationName, designation }
- \`CREATE_PRODUCT\`: { model, name, category }

### 4. OUTPUT FORMAT (JSON ONLY)
{
  "message": "Friendly response text summarizing what was found and what is being proposed. Be proactive, confident, and professional.",
  "actions": [
    { "type": "CREATE_WORKER", "data": { "name": "John Doe", "workerId": "EMP-9002", "locationName": "Factory A", "designation": "Ironing" } },
    { "type": "CREATE_PRODUCT", "data": { "model": "T-Shirt", "name": "Crew Neck", "category": "Apparel" } }
  ]
}

**CRITICAL RULE**: Your JSON must be completely strict and valid. Do not use literal newlines inside strings.
        `;

        const parts: any[] = [{ text: systemPrompt }];
        if (prompt) parts.push({ text: `User request: ${prompt}` });

        if (image) {
            const base64Data = image.split(",")[1];
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg"
                }
            });
        }

        let result;
        let attempts = 0;
        while (attempts < 3) {
            try {
                result = await model.generateContent(parts);
                break;
            } catch (error: any) {
                attempts++;
                console.warn(`Gemini Agent attempt ${attempts} failed:`, error.message);
                if (attempts === 3) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        if (!result) throw new Error("Failed to get response from Gemini Agent");

        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse AI response: " + responseText.substring(0, 100));

        try {
            const data = JSON.parse(jsonMatch[0]);
            return NextResponse.json(data);
        } catch (parseError: any) {
            console.error("JSON Parse Error:", parseError.message);
            throw new Error("AI response formatting error. Please try again.");
        }

    } catch (error: any) {
        console.error("AI Agent Error:", error);
        return NextResponse.json({
            error: error.message || "An unexpected error occurred"
        }, { status: 500 });
    }
}
