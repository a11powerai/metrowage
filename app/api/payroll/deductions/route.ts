import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const items = await prisma.deduction.findMany({ where: { applied: false }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
}
export async function POST(req: Request) {
    const body = await req.json();
    const item = await prisma.deduction.create({ data: { workerId: Number(body.workerId), type: body.type, description: body.description, amount: Number(body.amount), periodStart: new Date(body.periodStart), periodEnd: new Date(body.periodEnd) } });
    return NextResponse.json(item, { status: 201 });
}
