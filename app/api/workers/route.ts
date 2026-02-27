import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const workers = await prisma.worker.findMany({
        orderBy: { name: "asc" },
        include: { location: true },
    });
    return NextResponse.json(workers);
}

export async function POST(req: Request) {
    const body = await req.json();
    try {
        // Auto-generate Worker ID: MW-001, MW-002 ...
        const last = await prisma.worker.findFirst({ orderBy: { id: "desc" } });
        let nextNum = 1;
        if (last?.workerId) {
            const match = last.workerId.match(/\d+$/);
            if (match) nextNum = parseInt(match[0]) + 1;
        }
        const workerId = `MW-${String(nextNum).padStart(3, "0")}`;

        const { name, phone, nic, address, designation, allowGeoCheckin, locationId, status } = body;
        const worker = await prisma.worker.create({
            data: {
                workerId,
                name,
                phone: phone || null,
                nic: nic || null,
                address: address || null,
                designation: designation || null,
                allowGeoCheckin: allowGeoCheckin ?? false,
                locationId: locationId ? Number(locationId) : null,
                status: status || "Active",
            },
        });
        return NextResponse.json(worker, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message ?? "Error creating worker" }, { status: 409 });
    }
}
