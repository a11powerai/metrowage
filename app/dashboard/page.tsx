import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Users, Package, ClipboardList, TrendingUp, Clock, FileCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    const [workerCount, productCount, todayDay, totalPayout, todayAttendance, pendingLeaves] = await Promise.all([
        prisma.worker.count({ where: { status: "Active" } }),
        prisma.product.count(),
        prisma.productionDay.findFirst({
            where: {
                date: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            },
            include: { lines: true },
        }),
        prisma.productionLine.aggregate({ _sum: { lineTotal: true } }),
        prisma.attendance.count({ where: { date: new Date(todayStr), status: "Present" } }),
        prisma.leave.count({ where: { status: "Pending" } }),
    ]);

    const todayTotal = todayDay?.lines.reduce((a, l) => a + l.lineTotal, 0) ?? 0;

    const stats = [
        { label: "Active Workers", value: workerCount, icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
        { label: "Products", value: productCount, icon: Package, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "Present Today", value: todayAttendance, icon: Clock, color: "text-green-600", bg: "bg-green-100" },
        { label: "Pending Leaves", value: pendingLeaves, icon: FileCheck, color: "text-amber-600", bg: "bg-amber-100" },
        { label: "Today's Payout", value: formatCurrency(todayTotal), icon: ClipboardList, color: "text-emerald-600", bg: "bg-emerald-100" },
        { label: "Total Payout (All Time)", value: formatCurrency(totalPayout._sum.lineTotal ?? 0), icon: TrendingUp, color: "text-rose-600", bg: "bg-rose-100" },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Welcome back, <span className="font-medium text-purple-700">{session?.user?.name}</span> · <span className="text-gray-500">{role}</span>
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                                <Icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div className="text-xl font-bold text-gray-900">{s.value}</div>
                            <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-gray-800 mb-2">Today&apos;s Production</h2>
                {todayDay ? (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${todayDay.status === "Finalized" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {todayDay.status}
                            </span>
                            <span className="text-gray-500 text-xs">{todayDay.lines.length} entries</span>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Total payout for today: <span className="text-purple-700 font-bold">{formatCurrency(todayTotal)}</span>
                        </p>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No production entries yet for today.</p>
                )}
            </div>
        </div>
    );
}
