"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Package,
    ClipboardList,
    BarChart3,
    Calendar,
    TrendingUp,
    LogOut,
    ShieldCheck,
    ChevronDown,
    Menu,
    X,
    Wallet,
    Receipt,
    FileText,
} from "lucide-react";
import { useState } from "react";

const navItems = [
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["SuperAdmin", "Admin", "Supervisor"],
    },
    {
        label: "Workers",
        href: "/dashboard/workers",
        icon: Users,
        roles: ["SuperAdmin", "Admin"],
    },
    {
        label: "Products",
        href: "/dashboard/products",
        icon: Package,
        roles: ["SuperAdmin", "Admin"],
    },
    {
        label: "Production",
        href: "/dashboard/production",
        icon: ClipboardList,
        roles: ["SuperAdmin", "Admin", "Supervisor"],
    },
    {
        label: "Payroll",
        href: "/dashboard/payroll",
        icon: Wallet,
        roles: ["SuperAdmin", "Admin"],
        children: [
            { label: "Salary Profiles", href: "/dashboard/payroll/profiles", icon: Users },
            { label: "Allowances", href: "/dashboard/payroll/allowances", icon: Receipt },
            { label: "Deductions", href: "/dashboard/payroll/deductions", icon: Receipt },
            { label: "Commissions", href: "/dashboard/payroll/commissions", icon: TrendingUp },
            { label: "Run Payroll", href: "/dashboard/payroll/run", icon: Wallet },
            { label: "Payslips", href: "/dashboard/payroll/payslips", icon: FileText },
        ],
    },
    {
        label: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
        roles: ["SuperAdmin", "Admin"],
        children: [
            { label: "Daily", href: "/dashboard/reports/daily", icon: Calendar },
            { label: "Monthly", href: "/dashboard/reports/monthly", icon: BarChart3 },
            { label: "Yearly", href: "/dashboard/reports/yearly", icon: TrendingUp },
        ],
    },
    {
        label: "User Management",
        href: "/dashboard/admin/users",
        icon: ShieldCheck,
        roles: ["SuperAdmin"],
    },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const role = (session?.user as any)?.role as string;
    const [open, setOpen] = useState(false);
    const [reportsOpen, setReportsOpen] = useState(false);

    const filtered = navItems.filter((i) => i.roles.includes(role));

    const Nav = () => (
        <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {filtered.map((item) => {
                const Icon = item.icon;
                const isActive =
                    pathname === item.href ||
                    (item.children &&
                        item.children.some((c) => pathname.startsWith(c.href)));

                if (item.children) {
                    return (
                        <div key={item.href}>
                            <button
                                onClick={() => setReportsOpen(!reportsOpen)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{item.label}</span>
                                <ChevronDown
                                    className={cn(
                                        "w-3.5 h-3.5 ml-auto transition-transform",
                                        reportsOpen ? "rotate-180" : ""
                                    )}
                                />
                            </button>
                            {reportsOpen && (
                                <div className="ml-7 mt-1 flex flex-col gap-1">
                                    {item.children.map((child) => {
                                        const CIcon = child.icon;
                                        return (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                onClick={() => setOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                                                    pathname.startsWith(child.href)
                                                        ? "bg-blue-600 text-white"
                                                        : "text-slate-400 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <CIcon className="w-3.5 h-3.5" />
                                                {child.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                }

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">M</div>
                    <span className="font-semibold text-white">MetroWage</span>
                </div>
                <button onClick={() => setOpen(!open)} className="text-white">
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
                    <aside
                        className="w-64 h-full bg-slate-900 border-r border-white/10 p-4 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SidebarContent session={session} role={role} Nav={Nav} />
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-64 shrink-0 bg-slate-900 border-r border-white/10 flex-col p-4 h-screen sticky top-0">
                <SidebarContent session={session} role={role} Nav={Nav} />
            </aside>
        </>
    );
}

function SidebarContent({ session, role, Nav }: any) {
    return (
        <>
            <div className="flex items-center gap-3 px-1 mb-8">
                <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">M</div>
                <div>
                    <div className="text-white font-semibold text-sm leading-tight">MetroWage</div>
                    <div className="text-slate-500 text-xs">Factory Management</div>
                </div>
            </div>

            <Nav />

            <div className="mt-auto pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xs font-bold">
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0">
                        <div className="text-white text-xs font-medium truncate">{session?.user?.name}</div>
                        <div className="text-slate-500 text-xs truncate">{role}</div>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 text-sm transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </>
    );
}
