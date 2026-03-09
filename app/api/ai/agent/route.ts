import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { getGeminiApiKey } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    const userPermissions: string[] = (session?.user as any)?.permissions || [];
    const hasAccess = userRole === "SuperAdmin" || userPermissions.includes("ai.use");

    if (!session || !hasAccess) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { prompt, image, history } = await req.json();

        const apiKey = getGeminiApiKey();
        if (!apiKey) {
            return NextResponse.json({ error: "Gemini API Key not configured. Set GEMINI_API_KEY in environment." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        // Fetch live data for context
        const userName = (session.user as any)?.name || "sir";
        const userLocationId = (session.user as any)?.locationId;

        const workerFilter: any = { status: "Active" };
        if (userLocationId && userRole !== "SuperAdmin") {
            workerFilter.locationId = userLocationId;
        }

        const [workers, products, locations, recentAttendance, pendingLeaves] = await Promise.all([
            prisma.worker.findMany({ where: workerFilter, include: { location: true }, take: 200 }),
            prisma.product.findMany({ take: 50 }),
            prisma.location.findMany(),
            prisma.attendance.findMany({
                where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
                include: { worker: { select: { name: true, workerId: true } } },
                take: 200,
            }),
            prisma.leave.findMany({ where: { status: "Pending" }, include: { worker: { select: { name: true } } }, take: 20 }),
        ]);

        const todayPresent = recentAttendance.filter(a => a.status === "Present").length;
        const todayAbsent = recentAttendance.filter(a => a.status === "Absent").length;

        const systemPrompt = `
You are J.A.R.V.I.S — the advanced AI assistant for MetroWage Factory Management System.
You speak with calm confidence, wit, and precision — like Tony Stark's AI butler.
Address the user as "sir" or "ma'am". Be proactive, concise, and slightly charming.

## YOUR CAPABILITIES
- Answer questions about workers, products, attendance, production, payroll, and locations
- Propose database actions (creating workers, products, logging attendance, etc.)
- Analyze uploaded images (spreadsheets, attendance sheets, etc.) and extract data
- Provide summaries and insights from the live factory data below

## LIVE SYSTEM DATA
- **User**: ${userName} (Role: ${userRole})
- **Locations**: ${locations.map(l => `${l.name} (ID: ${l.id})`).join(", ") || "None"}
- **Active Workers (${workers.length})**: ${workers.slice(0, 30).map(w => `${w.name} [${w.workerId}] at ${w.location?.name || "Unassigned"}`).join(", ")}${workers.length > 30 ? ` ... and ${workers.length - 30} more` : ""}
- **Products (${products.length})**: ${products.slice(0, 20).map(p => `${p.name} (${p.model}, ${p.category})`).join(", ")}
- **Today's Attendance**: ${todayPresent} present, ${todayAbsent} absent, ${workers.length - todayPresent - todayAbsent} unmarked
- **Pending Leave Requests**: ${pendingLeaves.length > 0 ? pendingLeaves.map(l => `${l.worker.name}: ${l.leaveType}`).join(", ") : "None"}

## ACTION TYPES YOU CAN PROPOSE
- CREATE_WORKER: { name, workerId, locationName, designation, phone?, nic? }
- CREATE_PRODUCT: { model, name, category }
- LOG_ATTENDANCE: { workerId, date, status, checkInTime? }

## CONVERSATION HISTORY
${(history || []).map((m: any) => `${m.role === "user" ? "User" : "JARVIS"}: ${m.content}`).join("\n")}

## OUTPUT FORMAT (strict JSON)
{
  "message": "Your response text. Be helpful, witty, and reference real data. Use markdown formatting for readability.",
  "actions": []
}

If proposing actions, populate the actions array. If just answering, leave actions empty.
Keep responses concise but informative. Never fabricate data — use only what's provided above.
`;

        const parts: any[] = [{ text: systemPrompt }];
        if (prompt) parts.push({ text: `User: ${prompt}` });

        if (image) {
            const base64Data = image.split(",")[1];
            if (base64Data) {
                parts.push({
                    inlineData: { data: base64Data, mimeType: "image/jpeg" },
                });
            }
        }

        let result;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                result = await model.generateContent(parts);
                break;
            } catch (error: any) {
                console.warn(`Gemini attempt ${attempt} failed:`, error.message);
                if (attempt === 3) throw error;
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        if (!result) throw new Error("Failed to get response from AI");

        const responseText = result.response.text();
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse AI response");

        const data = JSON.parse(jsonMatch[0]);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("AI Agent Error:", error);
        return NextResponse.json({
            error: error.message || "An unexpected error occurred",
        }, { status: 500 });
    }
}
