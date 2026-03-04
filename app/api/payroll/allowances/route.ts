import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workerIds = await ctx.getWorkerIds();
    const where: any = { active: true };
    if (workerIds) where.workerId = { in: workerIds };

    const items = await prisma.allowance.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
}
export async function POST(req: Request) {
    const body = await req.json();
    const item = await prisma.allowance.create({ data: { workerId: Number(body.workerId), name: body.name, amount: Number(body.amount), frequency: body.frequency } });
    return NextResponse.json(item, { status: 201 });
}
