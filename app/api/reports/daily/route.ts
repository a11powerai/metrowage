import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) return NextResponse.json({ workers: [], factoryTotal: 0 });

    const date = new Date(dateStr);
    const day = await prisma.productionDay.findFirst({
        where: { date: { gte: startOfDay(date), lte: endOfDay(date) } },
        include: {
            lines: {
                include: { worker: true, product: true },
            },
        },
    });

    if (!day) return NextResponse.json({ workers: [], factoryTotal: 0, status: null });

    const workerMap: Record<number, any> = {};
    for (const line of day.lines) {
        const wid = line.workerId;
        if (!workerMap[wid]) workerMap[wid] = { name: line.worker.name, lines: [], total: 0 };
        workerMap[wid].lines.push({
            product: line.product.name,
            quantity: line.quantity,
            appliedRate: line.appliedRate,
            lineTotal: line.lineTotal,
        });
        workerMap[wid].total += line.lineTotal;
    }

    const factoryTotal = day.lines.reduce((a, l) => a + l.lineTotal, 0);
    return NextResponse.json({ workers: Object.values(workerMap), factoryTotal, status: day.status });
}
