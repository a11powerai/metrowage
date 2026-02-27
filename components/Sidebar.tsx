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
    MapPin,
    Clock,
    FileCheck,
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
        label: "Locations",
        href: "/dashboard/locations",
        icon: MapPin,
        roles: ["SuperAdmin", "Admin"],
    },
    {
        label: "Production",
        href: "/dashboard/production",
        icon: ClipboardList,
        roles: ["SuperAdmin", "Admin", "Supervisor"],
    },
    {
        label: "Attendance",
        href: "/dashboard/attendance",
        icon: Clock,
        roles: ["SuperAdmin", "Admin", "Supervisor"],
    },
    {
        label: "Leave",
        href: "/dashboard/leave",
        icon: FileCheck,
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
            { label: "Weekly", href: "/dashboard/reports/weekly", icon: BarChart3 },
            { label: "Monthly", href: "/dashboard/reports/monthly", icon: BarChart3 },
            { label: "Yearly", href: "/dashboard/reports/yearly", icon: TrendingUp },
        ],
    },
    {
        label: "Calendar",
        href: "/dashboard/calendar",
        icon: Calendar,
        roles: ["SuperAdmin", "Admin", "Supervisor"],
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
    const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

    const filtered = navItems.filter((i) => i.roles.includes(role));

    const toggleMenu = (href: string) => {
        setExpandedMenus((prev) =>
            prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
        );
    };

    const Nav = () => (
        <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
            {filtered.map((item) => {
                const Icon = item.icon;
                const isActive =
                    pathname === item.href ||
                    (item.children &&
                        item.children.some((c) => pathname.startsWith(c.href)));
                const isExpanded = expandedMenus.includes(item.href) || isActive;

                if (item.children) {
                    return (
                        <div key={item.href}>
                            <button
                                onClick={() => toggleMenu(item.href)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                    isActive
                                        ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                                        : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
                                )}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{item.label}</span>
                                <ChevronDown
                                    className={cn(
                                        "w-3.5 h-3.5 ml-auto transition-transform",
                                        isExpanded ? "rotate-180" : ""
                                    )}
                                />
                            </button>
                            {isExpanded && (
                                <div className="ml-7 mt-0.5 flex flex-col gap-0.5">
                                    {item.children.map((child) => {
                                        const CIcon = child.icon;
                                        return (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                onClick={() => setOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                                                    pathname.startsWith(child.href)
                                                        ? "bg-purple-100 text-purple-700 font-medium"
                                                        : "text-gray-500 hover:bg-purple-50 hover:text-purple-700"
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
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                            isActive
                                ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                                : "text-gray-600 hover:bg-purple-50 hover:text-purple-700"
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
            <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-purple-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center font-bold text-sm text-white">M</div>
                    <span className="font-semibold text-gray-900">MetroWage</span>
                </div>
                <button onClick={() => setOpen(!open)} className="text-gray-700">
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {/* Mobile drawer */}
            {open && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)}>
                    <aside
                        className="w-64 h-full bg-white border-r border-purple-100 p-4 flex flex-col shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SidebarContent session={session} role={role} Nav={Nav} />
                    </aside>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-purple-100 flex-col p-4 h-screen sticky top-0 shadow-sm">
                <SidebarContent session={session} role={role} Nav={Nav} />
            </aside>
        </>
    );
}

function SidebarContent({ session, role, Nav }: any) {
    return (
        <>
            <div className="flex items-center gap-3 px-1 mb-6">
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-purple-300/50 text-white">M</div>
                <div>
                    <div className="text-gray-900 font-bold text-sm leading-tight">MetroWage</div>
                    <div className="text-purple-400 text-xs">Factory Management</div>
                </div>
            </div>

            <Nav />

            <div className="mt-auto pt-4 border-t border-purple-100">
                <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-600 text-xs font-bold">
                        {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <div className="min-w-0">
                        <div className="text-gray-800 text-xs font-medium truncate">{session?.user?.name}</div>
                        <div className="text-purple-500 text-xs truncate">{role}</div>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 text-sm transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </>
    );
}
