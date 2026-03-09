import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

// Webhook endpoint for biometric attendance machines
// Accepts: POST with API key auth via x-api-key header
// Body: { workerId: string, timestamp: string, type: "IN" | "OUT" }
const API_KEY = process.env.WEBHOOK_API_KEY || "metrowage-webhook-key";

export async function POST(req: Request) {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== API_KEY) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { workerId, timestamp, type } = body;

        if (!workerId || !timestamp) {
            return NextResponse.json({ error: "workerId and timestamp required" }, { status: 400 });
        }

        // Find worker by workerId string (e.g. "MW-001")
        const worker = await prisma.worker.findUnique({ where: { workerId: String(workerId) } });
        if (!worker) {
            return NextResponse.json({ error: `Worker ${workerId} not found` }, { status: 404 });
        }

        const ts = new Date(timestamp);
        const dayStart = startOfDay(ts);
        const punchType = (type || "IN").toUpperCase();

        if (punchType === "IN") {
            // Upsert check-in
            await prisma.attendance.upsert({
                where: { workerId_date: { workerId: worker.id, date: dayStart } },
                create: {
                    workerId: worker.id,
                    date: dayStart,
                    checkInTime: ts,
                    status: "Present",
                },
                update: {
                    checkInTime: ts,
                    status: "Present",
                },
            });
        } else if (punchType === "OUT") {
            // Update check-out and calculate hours
            const existing = await prisma.attendance.findUnique({
                where: { workerId_date: { workerId: worker.id, date: dayStart } },
            });

            if (!existing) {
                // No check-in yet — create with just check-out
                await prisma.attendance.create({
                    data: {
                        workerId: worker.id,
                        date: dayStart,
                        checkOutTime: ts,
                        status: "Present",
                    },
                });
            } else {
                const hoursWorked = existing.checkInTime
                    ? parseFloat(((ts.getTime() - existing.checkInTime.getTime()) / 3600000).toFixed(2))
                    : 0;

                await prisma.attendance.update({
                    where: { id: existing.id },
                    data: {
                        checkOutTime: ts,
                        hoursWorked: Math.max(0, hoursWorked),
                    },
                });
            }
        } else {
            return NextResponse.json({ error: "type must be IN or OUT" }, { status: 400 });
        }

        return NextResponse.json({ ok: true, workerId, type: punchType, timestamp });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
