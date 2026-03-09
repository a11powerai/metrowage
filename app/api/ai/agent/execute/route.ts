import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !["SuperAdmin", "Admin"].includes(session.user.role as string)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { type, data } = await req.json();

        if (type === 'CREATE_WORKER') {
            const existing = await prisma.worker.findFirst({
                where: { name: { equals: data.name } }
            });

            if (existing) return NextResponse.json(existing);

            // Fetch a location by name or use the session location
            let dbLocation = await prisma.location.findFirst({
                where: { name: { equals: data.locationName || session.user.location } }
            });

            if (!dbLocation) {
                dbLocation = await prisma.location.create({
                    data: {
                        name: data.locationName || session.user.location || "Default",
                        address: "TBD"
                    }
                });
            }

            const worker = await prisma.worker.create({
                data: {
                    name: data.name,
                    workerId: data.workerId || `WRK-${Math.floor(Math.random() * 10000)}`,
                    nic: data.nic || null,
                    phone: data.phone || null,
                    locationId: dbLocation.id,
                    designation: data.designation || 'General',
                }
            });
            return NextResponse.json(worker);
        }

        if (type === 'CREATE_PRODUCT') {
            const existing = await prisma.product.findFirst({
                where: {
                    model: { equals: data.model },
                    name: { equals: data.name }
                }
            });
            if (existing) return NextResponse.json(existing);

            const product = await prisma.product.create({
                data: {
                    model: data.model,
                    name: data.name,
                    category: data.category || "General",
                    productId: `PRD-${Math.floor(Math.random() * 10000)}`
                }
            });
            return NextResponse.json(product);
        }

        return NextResponse.json({ error: "Unknown action type" }, { status: 400 });

    } catch (error: any) {
        console.error("AI Execution Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
