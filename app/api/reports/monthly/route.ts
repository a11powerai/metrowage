import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const year = Number(searchParams.get("year") ?? new Date().getFullYear());
    const month = Number(searchParams.get("month") ?? new Date().getMonth() + 1);

    const start = startOfMonth(new Date(year, month - 1, 1));
    const end = endOfMonth(new Date(year, month - 1, 1));

    const lines = await prisma.productionLine.findMany({
        where: { day: { date: { gte: start, lte: end } } },
        include: { worker: true, product: true, day: true },
    });

    const workerMap: Record<number, any> = {};
    const productMap: Record<number, any> = {};
    const daySet = new Set<number>();

    for (const line of lines) {
        daySet.add(line.dayId);
        if (!workerMap[line.workerId]) workerMap[line.workerId] = { name: line.worker.name, total: 0 };
        workerMap[line.workerId].total += line.lineTotal;
        if (!productMap[line.productId]) productMap[line.productId] = { name: line.product.name, qty: 0, total: 0 };
        productMap[line.productId].qty += line.quantity;
        productMap[line.productId].total += line.lineTotal;
    }

    return NextResponse.json({
        workers: Object.values(workerMap),
        products: Object.values(productMap),
        factoryTotal: lines.reduce((a: number, l: { lineTotal: number }) => a + l.lineTotal, 0),
        workingDays: daySet.size,
    });
}
