import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const date = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const workerId = searchParams.get("workerId");

    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Build the worker sub-filter for location scoping.
    // Attendance has no locationId — we scope through the worker relation.
    const workerWhere: any = {};
    if (!ctx.isAdmin && ctx.locationId) {
        workerWhere.locationId = ctx.locationId;
    }

    const where: any = { worker: workerWhere };
    if (date) where.date = startOfDay(new Date(date));
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = startOfDay(new Date(dateFrom));
        if (dateTo) where.date.lte = startOfDay(new Date(dateTo));
    }
    if (workerId) where.workerId = Number(workerId);

    const records = await prisma.attendance.findMany({
        where,
        include: { worker: { select: { id: true, workerId: true, name: true, designation: true, locationId: true } } },
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
