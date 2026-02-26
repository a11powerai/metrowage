import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const period = await prisma.payrollPeriod.findUnique({
        where: { id: Number(params.id) },
        include: {
            records: {
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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const body = await req.json();
    // Finalize
    const period = await prisma.payrollPeriod.update({
        where: { id: Number(params.id) },
        data: { status: body.status },
    });
    if (body.status === "Finalized") {
        await prisma.auditLog.create({
            data: { periodId: period.id, userId: 1, action: "FINALIZE", detail: `Payroll finalized: ${period.name}` },
        });
    }
    return NextResponse.json(period);
}
