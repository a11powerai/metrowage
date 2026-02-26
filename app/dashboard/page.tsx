import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Users, Package, ClipboardList, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    const [workerCount, productCount, todayDay, totalPayout] = await Promise.all([
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
    ]);

    const todayTotal = todayDay?.lines.reduce((a, l) => a + l.lineTotal, 0) ?? 0;

    const stats = [
        {
            label: "Active Workers",
            value: workerCount,
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
        },
        {
            label: "Products",
            value: productCount,
            icon: Package,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
        },
        {
            label: "Today's Payout",
            value: formatCurrency(todayTotal),
            icon: ClipboardList,
            color: "text-green-400",
            bg: "bg-green-500/10",
        },
        {
            label: "Total Payout (All Time)",
            value: formatCurrency(totalPayout._sum.lineTotal ?? 0),
            icon: TrendingUp,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Welcome back, {session?.user?.name} · {role}
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className="bg-slate-800/50 border border-white/10 rounded-xl p-5"
                        >
                            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                                <Icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div className="text-xl font-bold">{s.value}</div>
                            <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-slate-800/50 border border-white/10 rounded-xl p-6">
                <h2 className="font-semibold mb-2">Today&apos;s Production</h2>
                {todayDay ? (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${todayDay.status === "Finalized"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                    }`}
                            >
                                {todayDay.status}
                            </span>
                            <span className="text-slate-400 text-xs">{todayDay.lines.length} entries</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Total payout for today: <span className="text-white font-semibold">{formatCurrency(todayTotal)}</span>
                        </p>
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">No production entries yet for today.</p>
                )}
            </div>
        </div>
    );
}
