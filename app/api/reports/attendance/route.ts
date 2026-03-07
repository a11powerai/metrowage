import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const dateStr = searchParams.get("date");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Scope workers and attendance by location for non-admins
    const workerScope: any = { status: "Active" };
    const attendanceWorkerScope: any = {};
    if (!ctx.isAdmin && ctx.locationId) {
        workerScope.locationId = ctx.locationId;
        attendanceWorkerScope.locationId = ctx.locationId;
    }

    let where: any = { worker: attendanceWorkerScope };
    if (dateStr) {
        const d = new Date(dateStr);
        const start = new Date(d); start.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        where.date = { gte: start, lte: end };
    } else if (dateFrom && dateTo) {
        where.date = {
            gte: new Date(dateFrom + "T00:00:00.000Z"),
            lte: new Date(dateTo + "T23:59:59.999Z"),
        };
    }

    const [records, workers] = await Promise.all([
        prisma.attendance.findMany({ where, include: { worker: { select: { name: true, workerId: true } } }, orderBy: { date: "desc" } }),
        prisma.worker.findMany({ where: workerScope, select: { id: true, name: true, workerId: true } }),
    ]);

    const present = records.filter(r => r.status === "Present").length;
    const absent = records.filter(r => r.status === "Absent").length;
    const onLeave = records.filter(r => r.status === "Leave").length;
    const holiday = records.filter(r => r.status === "Holiday").length;
    const marked = records.length;
    const total = workers.length;
    const pending = total - marked;

    return NextResponse.json({ present, absent, onLeave, holiday, pending, total, records, workers });
}
