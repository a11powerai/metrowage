import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSessionContext() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const user = session.user as any;
    const permissions: string[] = user.permissions ?? [];
    const isAdmin = permissions.includes("admin.users") || ["SuperAdmin", "Admin"].includes(user.role);

    return {
        id: user.id,
        role: user.role,
        roleId: user.roleId,
        locationId: user.locationId,
        permissions,
        isAdmin,
        // Check if user has a specific permission
        hasPermission: (key: string) => permissions.includes(key),
        // Helper to get location filter object for Prisma (for models with locationId)
        getLocationFilter: () => {
            if (isAdmin) return {}; // No restriction for Admins
            return {
                locationId: user.locationId
            };
        },
        // Helper to get worker IDs for models without a direct worker relation
        getWorkerIds: async () => {
            if (isAdmin) return undefined; // No restriction
            const workers = await prisma.worker.findMany({
                where: { locationId: user.locationId },
                select: { id: true },
            });
            return workers.map(w => w.id);
        },
    };
}
