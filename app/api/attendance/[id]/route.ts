import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function diffHours(a: Date, b: Date) {
    return Math.abs((b.getTime() - a.getTime()) / 3600000);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { checkOutTime, status } = body;

    const existing = await prisma.attendance.findUnique({ where: { id: Number(id) } });
    let hoursWorked = existing?.hoursWorked ?? 0;
    if (checkOutTime && existing?.checkInTime) {
        hoursWorked = parseFloat(diffHours(existing.checkInTime, new Date(checkOutTime)).toFixed(2));
    }

    const record = await prisma.attendance.update({
        where: { id: Number(id) },
        data: {
            checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
            hoursWorked,
            status: status ?? existing?.status,
        },
    });
    return NextResponse.json(record);
}
