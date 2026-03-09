import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const shifts = await prisma.shiftConfig.findMany({
        include: { location: { select: { id: true, name: true } } },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(shifts);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { name, startTime, endTime, breakMinutes, standardHours, locationId, isDefault } = body;

    // If setting as default, unset other defaults
    if (isDefault) {
        await prisma.shiftConfig.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const shift = await prisma.shiftConfig.create({
        data: {
            name: name || "New Shift",
            startTime: startTime || "08:00",
            endTime: endTime || "17:30",
            breakMinutes: breakMinutes ?? 60,
            standardHours: standardHours ?? 8,
            locationId: locationId ? Number(locationId) : null,
            isDefault: isDefault ?? false,
        },
    });
    return NextResponse.json(shift, { status: 201 });
}
