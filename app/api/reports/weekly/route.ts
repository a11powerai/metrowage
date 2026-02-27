import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return NextResponse.json({ error: "from/to required" }, { status: 400 });

    const start = startOfDay(new Date(from));
    const end = endOfDay(new Date(to));

    const lines = await prisma.productionLine.findMany({
        where: {
            day: {
                date: { gte: start, lte: end },
            },
        },
        include: {
            worker: { select: { id: true, workerId: true, name: true, designation: true } },
            product: { select: { name: true, category: true, model: true } },
            day: { select: { date: true, status: true } },
        },
        orderBy: [{ day: { date: "asc" } }, { workerId: "asc" }],
    });

    // Group by worker
    const workerMap: Record<number, any> = {};
    for (const line of lines) {
        const wId = line.worker.id;
        if (!workerMap[wId]) {
            workerMap[wId] = {
                workerId: line.worker.workerId,
                name: line.worker.name,
                designation: line.worker.designation,
                totalQty: 0,
                totalEarnings: 0,
                lines: [],
            };
        }
        workerMap[wId].totalQty += line.quantity;
        workerMap[wId].totalEarnings += line.lineTotal;
        workerMap[wId].lines.push({
            date: line.day.date,
            productName: `${line.product.name}${line.product.model ? ` (${line.product.model})` : ""}`,
            quantity: line.quantity,
            appliedRate: line.appliedRate,
            lineTotal: line.lineTotal,
            dayStatus: line.day.status,
        });
    }

    return NextResponse.json(Object.values(workerMap));
}
