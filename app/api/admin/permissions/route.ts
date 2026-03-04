import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx || !ctx.hasPermission("admin.roles")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const permissions = await prisma.permission.findMany({
        orderBy: [{ module: "asc" }, { key: "asc" }],
    });

    // Group by module
    const grouped: Record<string, { key: string; label: string }[]> = {};
    for (const p of permissions) {
        if (!grouped[p.module]) grouped[p.module] = [];
        grouped[p.module].push({ key: p.key, label: p.label });
    }

    return NextResponse.json({ permissions, grouped });
}
