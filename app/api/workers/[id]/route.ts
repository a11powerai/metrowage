import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const worker = await prisma.worker.findUnique({
        where: { id: Number(id) },
        include: { location: true, salaryProfile: true },
    });
    return NextResponse.json(worker);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const { name, phone, nic, address, designation, allowGeoCheckin, locationId, status } = body;
    const worker = await prisma.worker.update({
        where: { id: Number(id) },
        data: {
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
    return NextResponse.json(worker);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.worker.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
