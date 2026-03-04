import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const workerId = searchParams.get("workerId");

    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workerIds = await ctx.getWorkerIds();
    const where: any = {};
    if (workerIds) where.workerId = { in: workerIds };
    if (workerId) where.workerId = Number(workerId);

    const items = await prisma.commission.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
}
export async function POST(req: Request) {
    const body = await req.json();
    const item = await prisma.commission.create({
        data: {
            workerId: Number(body.workerId),
            series: body.series,
            amount: Number(body.amount),
            periodStart: new Date(body.periodStart),
            periodEnd: new Date(body.periodEnd),
            approved: body.approved === true,
        },
    });
    return NextResponse.json(item, { status: 201 });
}
