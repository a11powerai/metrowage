import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateHoursWorked, calculateOvertimeHours } from "@/lib/payroll-utils";

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
    let overtimeHours = 0; // attendance DB doesn't store OT yet, but we return it to the frontend

    if (newCheckIn && newCheckOut) {
        hoursWorked = calculateHoursWorked(newCheckIn, newCheckOut);
        overtimeHours = calculateOvertimeHours(hoursWorked);
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
    return NextResponse.json({ ...record, overtimeHours });
}
