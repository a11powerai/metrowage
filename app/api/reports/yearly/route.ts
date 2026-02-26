import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfYear, endOfYear, getMonth } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());

    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));

    const lines = await prisma.productionLine.findMany({
        where: { day: { date: { gte: start, lte: end } } },
        include: { worker: true, product: true, day: true },
    });

    const monthMap: Record<number, { month: number; total: number; days: Set<number> }> = {};
    const workerMap: Record<number, any> = {};

    for (const line of lines) {
        const m = getMonth(line.day.date) + 1;
        if (!monthMap[m]) monthMap[m] = { month: m, total: 0, days: new Set() };
        monthMap[m].total += line.lineTotal;
        monthMap[m].days.add(line.dayId);

        if (!workerMap[line.workerId]) workerMap[line.workerId] = { name: line.worker.name, total: 0 };
        workerMap[line.workerId].total += line.lineTotal;
    }

    const months = Object.values(monthMap)
        .map((m) => ({ month: m.month, total: m.total, days: m.days.size }))
        .sort((a, b) => a.month - b.month);

    return NextResponse.json({
        months,
        workers: Object.values(workerMap),
        yearTotal: lines.reduce((a: number, l: { lineTotal: number }) => a + l.lineTotal, 0),
        totalDays: new Set(lines.map((l) => l.dayId)).size,
    });
}
