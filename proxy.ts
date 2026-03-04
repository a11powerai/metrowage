import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Route prefix → required permission key
const ROUTE_PERMISSIONS: Record<string, string> = {
    "/dashboard/admin/roles": "admin.roles",
    "/dashboard/admin": "admin.users",
    "/dashboard/workers": "workers.view",
    "/dashboard/products": "products.view",
    "/dashboard/production": "production.view",
    "/dashboard/attendance": "attendance.view",
    "/dashboard/leave": "leave.view",
    "/dashboard/payroll": "payroll.view",
    "/dashboard/reports": "reports.view",
    "/dashboard/calendar": "calendar.view",
    "/dashboard/locations": "locations.manage",
};

export default async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes bypass
    if (pathname === "/" || pathname === "/login") {
        return NextResponse.next();
    }

    // Try to get token
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        if (pathname !== "/login") {
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    const permissions = (token.permissions as string[]) ?? [];

    // Check route permissions — most specific route first (sorted by length desc)
    const sortedRoutes = Object.entries(ROUTE_PERMISSIONS)
        .sort((a, b) => b[0].length - a[0].length);

    for (const [route, requiredPerm] of sortedRoutes) {
        if (pathname.startsWith(route) && !permissions.includes(requiredPerm)) {
            const url = req.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
