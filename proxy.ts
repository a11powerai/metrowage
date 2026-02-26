import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const ROLE_RESTRICTED: Record<string, string[]> = {
    "/dashboard/admin": ["SuperAdmin"],
    "/dashboard/workers": ["SuperAdmin", "Admin"],
    "/dashboard/products": ["SuperAdmin", "Admin"],
    "/dashboard/reports": ["SuperAdmin", "Admin"],
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
        // Protect against loop and ensure redirect is valid
        if (pathname !== "/login") {
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    const role = token.role as string;
    for (const [route, roles] of Object.entries(ROLE_RESTRICTED)) {
        if (pathname.startsWith(route) && !roles.includes(role)) {
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
