import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workers = await prisma.worker.findMany({
        where: ctx.getLocationFilter(),
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

        const ctx = await getSessionContext();
        if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { name, phone, nic, address, designation, allowGeoCheckin, status } = body;
        let { locationId } = body;

        // If not Admin, enforce the user's location
        if (!ctx.isAdmin) {
            locationId = ctx.locationId;
        }

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
