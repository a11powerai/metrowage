import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { name, startTime, endTime, breakMinutes, standardHours, locationId, isDefault } = body;

    if (isDefault) {
        await prisma.shiftConfig.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    }

    const shift = await prisma.shiftConfig.update({
        where: { id: Number(id) },
        data: {
            name,
            startTime,
            endTime,
            breakMinutes,
            standardHours,
            locationId: locationId ? Number(locationId) : null,
            isDefault: isDefault ?? false,
        },
    });
    return NextResponse.json(shift);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.shiftConfig.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
