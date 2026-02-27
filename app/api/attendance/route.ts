import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const workerId = searchParams.get("workerId");

    const where: any = {};
    if (date) where.date = startOfDay(new Date(date));
    if (workerId) where.workerId = Number(workerId);

    const records = await prisma.attendance.findMany({
        where,
        include: { worker: { select: { id: true, workerId: true, name: true, designation: true } } },
        orderBy: [{ date: "desc" }, { workerId: "asc" }],
    });
    return NextResponse.json(records);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { workerId, date, checkInTime, checkInLat, checkInLng, status } = body;

    const dayStart = startOfDay(new Date(date));
    try {
        const record = await prisma.attendance.upsert({
            where: { workerId_date: { workerId: Number(workerId), date: dayStart } },
            create: {
                workerId: Number(workerId),
                date: dayStart,
                checkInTime: checkInTime ? new Date(checkInTime) : null,
                checkInLat: checkInLat ?? null,
                checkInLng: checkInLng ?? null,
                status: status ?? "Present",
            },
            update: {
                checkInTime: checkInTime ? new Date(checkInTime) : undefined,
                checkInLat: checkInLat ?? undefined,
                checkInLng: checkInLng ?? undefined,
                status: status ?? "Present",
            },
        });
        return NextResponse.json(record, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
