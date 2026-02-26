import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ROLE_RESTRICTED: Record<string, string[]> = {
    "/dashboard/admin": ["SuperAdmin"],
    "/dashboard/workers": ["SuperAdmin", "Admin"],
    "/dashboard/products": ["SuperAdmin", "Admin"],
    "/dashboard/reports": ["SuperAdmin", "Admin"],
};

export default withAuth(
    function proxy(req) {
        const { pathname } = req.nextUrl;

        const role = req.nextauth.token?.role as string;

        for (const [route, roles] of Object.entries(ROLE_RESTRICTED)) {
            if (pathname.startsWith(route) && !roles.includes(role)) {
                const url = req.nextUrl.clone();
                url.pathname = "/dashboard";
                return NextResponse.redirect(url);
            }
        }


        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;
                if (pathname === "/" || pathname === "/login") return true;
                return !!token;
            },
        },
        pages: { signIn: "/login" },
    }
);

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
