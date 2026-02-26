import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const workers = await prisma.worker.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(workers);
}

export async function POST(req: Request) {
    const body = await req.json();
    try {
        const worker = await prisma.worker.create({ data: body });
        return NextResponse.json(worker, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Worker ID already exists" }, { status: 409 });
    }
}
