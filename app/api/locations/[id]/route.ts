import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await req.json();
    const location = await prisma.location.update({
        where: { id: Number(id) },
        data: {
            name: body.name,
            address: body.address || "",
            lat: body.lat ? parseFloat(body.lat) : null,
            lng: body.lng ? parseFloat(body.lng) : null,
            radius: body.radius ? parseFloat(body.radius) : 200,
        },
    });
    return NextResponse.json(location);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await prisma.location.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
}
