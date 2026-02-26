import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const items = await prisma.allowance.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(items);
}
export async function POST(req: Request) {
    const body = await req.json();
    const item = await prisma.allowance.create({ data: { workerId: Number(body.workerId), name: body.name, amount: Number(body.amount), frequency: body.frequency } });
    return NextResponse.json(item, { status: 201 });
}
