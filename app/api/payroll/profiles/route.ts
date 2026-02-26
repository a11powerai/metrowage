import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const profiles = await prisma.workerSalaryProfile.findMany({ include: { worker: true } });
    return NextResponse.json(profiles);
}

export async function POST(req: Request) {
    const body = await req.json();
    const profile = await prisma.workerSalaryProfile.upsert({
        where: { workerId: Number(body.workerId) },
        update: { basicSalary: body.basicSalary, overtimeRate: body.overtimeRate, workerType: body.workerType },
        create: { workerId: Number(body.workerId), basicSalary: body.basicSalary, overtimeRate: body.overtimeRate, workerType: body.workerType },
    });
    return NextResponse.json(profile, { status: 201 });
}
