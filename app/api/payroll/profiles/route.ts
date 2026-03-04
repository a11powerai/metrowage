import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profiles = await prisma.workerSalaryProfile.findMany({
        where: { worker: ctx.getLocationFilter() },
        include: { worker: true }
    });
    return NextResponse.json(profiles);
}

export async function POST(req: Request) {
    const body = await req.json();
    const profile = await prisma.workerSalaryProfile.upsert({
        where: { workerId: Number(body.workerId) },
        update: {
            basicSalary: body.basicSalary,
            salaryFrequency: body.salaryFrequency ?? "Monthly",
            overtimeRate: body.overtimeRate,
            workerType: body.workerType,
        },
        create: {
            workerId: Number(body.workerId),
            basicSalary: body.basicSalary,
            salaryFrequency: body.salaryFrequency ?? "Monthly",
            overtimeRate: body.overtimeRate,
            workerType: body.workerType,
        },
    });
    return NextResponse.json(profile, { status: 201 });
}
