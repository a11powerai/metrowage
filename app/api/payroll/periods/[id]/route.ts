import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const period = await prisma.payrollPeriod.findUnique({
        where: { id: Number(id) },
        include: {
            records: {
                where: { worker: ctx.getLocationFilter() },
                include: {
                    worker: true,
                    assemblyLines: true,
                    allowanceLines: true,
                    deductionLines: true,
                    commissionLines: true,
                },
            },
        },
    });
    return NextResponse.json(period);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    // Finalize
    const period = await prisma.payrollPeriod.update({
        where: { id: Number(id) },
        data: { status: body.status },
    });
    if (body.status === "Finalized") {
        await prisma.auditLog.create({
            data: { periodId: period.id, userId: 1, action: "FINALIZE", detail: `Payroll finalized: ${period.name}` },
        });
    }
    return NextResponse.json(period);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (ctx.role !== "SuperAdmin") return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 });

    const period = await prisma.payrollPeriod.findUnique({ where: { id: Number(id) } });
    if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (period.status === "Finalized") {
        return NextResponse.json({ error: "Cannot delete a finalized payroll period." }, { status: 403 });
    }

    // Delete all associated records first (cascade should handle, but be explicit)
    await prisma.payrollRecord.deleteMany({ where: { periodId: period.id } });
    await prisma.payrollPeriod.delete({ where: { id: period.id } });

    await prisma.auditLog.create({
        data: { periodId: null, userId: Number(ctx.id), action: "DELETE_PERIOD", detail: `Deleted payroll period: ${period.name}` },
    });

    return NextResponse.json({ ok: true });
}
