import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const worker = await prisma.worker.findUnique({
        where: { id: Number(id) },
        include: { location: true, salaryProfile: true },
    });
    return NextResponse.json(worker);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, nic, address, designation, allowGeoCheckin, locationId, status } = body;
    const worker = await prisma.worker.update({
        where: { id: Number(id) },
        data: {
            name,
            phone: phone || null,
            nic: nic || null,
            address: address || null,
            designation: designation || null,
            allowGeoCheckin: allowGeoCheckin ?? false,
            locationId: locationId ? Number(locationId) : null,
            status: status || "Active",
        },
    });
    return NextResponse.json(worker);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const wid = Number(id);

    await prisma.$transaction(async (tx) => {
        // Delete payroll line items first (they reference payroll records)
        const pRecords = await tx.payrollRecord.findMany({
            where: { workerId: wid },
            select: { id: true },
        });
        const rIds = pRecords.map((r) => r.id);

        if (rIds.length > 0) {
            await tx.assemblyPayrollLine.deleteMany({ where: { recordId: { in: rIds } } });
            await tx.allowancePayrollLine.deleteMany({ where: { recordId: { in: rIds } } });
            await tx.deductionPayrollLine.deleteMany({ where: { recordId: { in: rIds } } });
            await tx.commissionPayrollLine.deleteMany({ where: { recordId: { in: rIds } } });
        }

        await tx.payrollRecord.deleteMany({ where: { workerId: wid } });
        await tx.productionLine.deleteMany({ where: { workerId: wid } });
        await tx.attendance.deleteMany({ where: { workerId: wid } });
        await tx.leave.deleteMany({ where: { workerId: wid } });
        await tx.deduction.deleteMany({ where: { workerId: wid } });
        await tx.allowance.deleteMany({ where: { workerId: wid } });
        await tx.commission.deleteMany({ where: { workerId: wid } });
        // salaryProfile has onDelete: Cascade so it auto-deletes
        await tx.worker.delete({ where: { id: wid } });
    });

    return NextResponse.json({ ok: true });
}
