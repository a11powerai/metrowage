import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const locations = await prisma.location.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { workers: true } } },
    });
    return NextResponse.json(locations);
}

export async function POST(req: Request) {
    const body = await req.json();
    const location = await prisma.location.create({
        data: {
            name: body.name,
            address: body.address || "",
            lat: body.lat ? parseFloat(body.lat) : null,
            lng: body.lng ? parseFloat(body.lng) : null,
            radius: body.radius ? parseFloat(body.radius) : 200,
        },
    });
    return NextResponse.json(location, { status: 201 });
}
