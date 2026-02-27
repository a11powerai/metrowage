import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const year = searchParams.get("year") ?? new Date().getFullYear().toString();
    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31`),
            },
        },
        orderBy: { date: "asc" },
    });
    return NextResponse.json(holidays);
}

export async function POST(req: Request) {
    const body = await req.json();

    // Bulk seed support — use upsert per item since SQLite doesn't support skipDuplicates
    if (Array.isArray(body)) {
        for (const h of body) {
            const date = new Date(h.date);
            await prisma.holiday.upsert({
                where: { date },
                create: { date, name: h.name, editable: h.editable ?? true },
                update: {},
            });
        }
        return NextResponse.json({ ok: true }, { status: 201 });
    }

    const holiday = await prisma.holiday.create({
        data: { date: new Date(body.date), name: body.name, editable: body.editable ?? true },
    });
    return NextResponse.json(holiday, { status: 201 });
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await prisma.holiday.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
