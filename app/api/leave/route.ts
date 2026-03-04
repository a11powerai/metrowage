import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const workerId = searchParams.get("workerId");
    const status = searchParams.get("status");

    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const where: any = { worker: ctx.getLocationFilter() };
    if (workerId) where.workerId = Number(workerId);
    if (status) where.status = status;

    const leaves = await prisma.leave.findMany({
        where,
        include: { worker: { select: { id: true, workerId: true, name: true, locationId: true } } },
        orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leaves);
}

export async function POST(req: Request) {
    const body = await req.json();
    const leave = await prisma.leave.create({
        data: {
            workerId: Number(body.workerId),
            fromDate: new Date(body.fromDate),
            toDate: new Date(body.toDate),
            leaveType: body.leaveType || "Annual",
            reason: body.reason,
            status: "Pending",
        },
    });
    return NextResponse.json(leave, { status: 201 });
}
