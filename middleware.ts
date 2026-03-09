import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const PAGE_PERMISSIONS: Record<string, string[]> = {
    "/dashboard/admin/users": ["admin.users"],
    "/dashboard/admin/roles": ["admin.roles"],
    "/dashboard/admin/machines": ["admin.users"],
    "/dashboard/workers": ["workers.view"],
    "/dashboard/products": ["products.view"],
    "/dashboard/locations": ["locations.manage"],
    "/dashboard/production": ["production.view"],
    "/dashboard/attendance": ["attendance.view"],
    "/dashboard/leave": ["leave.view"],
    "/dashboard/payroll": ["payroll.view", "payroll.manage"],
    "/dashboard/reports": ["reports.view"],
    "/dashboard/calendar": ["calendar.view"],
};

const API_PERMISSIONS: Record<string, Record<string, string>> = {
    "/api/workers": { GET: "workers.view", POST: "workers.manage", PUT: "workers.manage", DELETE: "workers.manage" },
    "/api/products": { GET: "products.view", POST: "products.manage", PUT: "products.manage", DELETE: "products.manage" },
    "/api/locations": { GET: "locations.manage", POST: "locations.manage", PUT: "locations.manage", DELETE: "locations.manage" },
    "/api/production": { GET: "production.view", POST: "production.manage" },
    "/api/attendance": { GET: "attendance.view", POST: "attendance.log", PATCH: "attendance.log" },
    "/api/leave": { GET: "leave.view", POST: "leave.apply", PATCH: "leave.apply" },
    "/api/payroll/profiles": { GET: "payroll.view", POST: "payroll.manage" },
    "/api/payroll/allowances": { GET: "payroll.view", POST: "payroll.manage" },
    "/api/payroll/deductions": { GET: "payroll.view", POST: "payroll.manage" },
    "/api/payroll/commissions": { GET: "payroll.view", POST: "payroll.manage" },
    "/api/payroll/periods": { GET: "payroll.view", POST: "payroll.manage", PATCH: "payroll.manage" },
    "/api/reports": { GET: "reports.view" },
    "/api/holidays": { GET: "calendar.view", POST: "calendar.view" },
    "/api/admin/users": { GET: "admin.users", POST: "admin.users", PATCH: "admin.users", DELETE: "admin.users" },
    "/api/admin/roles": { GET: "admin.roles", POST: "admin.roles", PATCH: "admin.roles", DELETE: "admin.roles" },
    "/api/admin/permissions": { GET: "admin.roles" },
};

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes
    if (pathname === "/" || pathname === "/login" || pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // Webhook uses API key auth, not JWT
    if (pathname.startsWith("/api/webhook")) {
        return NextResponse.next();
    }

    // AI agent routes
    if (pathname.startsWith("/api/ai")) {
        return NextResponse.next();
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    // Permissions come as string[] from auth.ts
    const permsRaw = token.permissions;
    const permissions = new Set(
        Array.isArray(permsRaw) ? permsRaw : typeof permsRaw === "string" ? (permsRaw as string).split(",") : []
    );

    // Check page-level permissions
    if (pathname.startsWith("/dashboard") && pathname !== "/dashboard") {
        for (const [route, requiredPerms] of Object.entries(PAGE_PERMISSIONS)) {
            if (pathname.startsWith(route)) {
                if (!requiredPerms.some((p) => permissions.has(p))) {
                    const url = req.nextUrl.clone();
                    url.pathname = "/dashboard";
                    return NextResponse.redirect(url);
                }
                break;
            }
        }
    }

    // Check API-level permissions
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
        const method = req.method;
        for (const [route, methodPerms] of Object.entries(API_PERMISSIONS)) {
            if (pathname.startsWith(route)) {
                const required = methodPerms[method];
                if (required && !permissions.has(required)) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }
                break;
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
