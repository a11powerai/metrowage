import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function diffHours(a: Date, b: Date) {
    return Math.abs((b.getTime() - a.getTime()) / 3600000);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { checkInTime, checkOutTime, status } = body;

    const existing = await prisma.attendance.findUnique({ where: { id: Number(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const newCheckIn = checkInTime ? new Date(checkInTime) : existing.checkInTime;
    const newCheckOut = checkOutTime !== undefined
        ? (checkOutTime ? new Date(checkOutTime) : null)
        : existing.checkOutTime;

    let hoursWorked = existing.hoursWorked ?? 0;
    if (newCheckIn && newCheckOut) {
        hoursWorked = parseFloat(diffHours(newCheckIn, newCheckOut).toFixed(2));
    }

    const record = await prisma.attendance.update({
        where: { id: Number(id) },
        data: {
            checkInTime: newCheckIn ?? undefined,
            checkOutTime: newCheckOut,
            hoursWorked,
            status: status ?? existing.status,
        },
    });
    return NextResponse.json(record);
}
