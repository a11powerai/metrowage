"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function MonthlyReportPage() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/monthly?year=${year}&month=${month}`);
        setData(await res.json());
        setLoading(false);
    };

    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = data?.workers?.map((w: any) => ({ Worker: w.name, "Total Earnings (Rs.)": w.total })) ?? [];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
        XLSX.writeFile(wb, `metrowage-monthly-${year}-${month}.xlsx`);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Monthly Report</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Worker earnings and product totals for the month</p>
                </div>
                {data && <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"><Download className="w-3.5 h-3.5" /> Excel</button>}
            </div>

            <div className="flex items-center gap-3 mb-6">
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>
                <input type="number" value={year} min={2020} max={2100} onChange={e => setYear(Number(e.target.value))} className="w-24 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                    {loading ? "Loading…" : "Generate"}
                </button>
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Total Factory Payout</div>
                            <div className="text-2xl font-bold text-green-400">{formatCurrency(data.factoryTotal)}</div>
                        </div>
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Working Days</div>
                            <div className="text-2xl font-bold">{data.workingDays}</div>
                        </div>
                    </div>

                    {data.workers?.length > 0 && (
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-6">
                            <h2 className="font-semibold mb-4 text-sm">Worker Earnings</h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={data.workers}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(v: any) => [`Rs. ${v}`, "Earnings"]} />
                                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-white/10 font-semibold text-sm">Worker Totals</div>
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-white/10"><th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">Worker</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Total Earnings</th></tr></thead>
                            <tbody>
                                {data.workers?.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-slate-500">No data.</td></tr>}
                                {data.workers?.map((w: any) => (
                                    <tr key={w.name} className="border-b border-white/5"><td className="px-4 py-3">{w.name}</td><td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(w.total)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 font-semibold text-sm">Product Production</div>
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-white/10"><th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">Product</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Total Qty</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Total Payout</th></tr></thead>
                            <tbody>
                                {data.products?.map((p: any) => (
                                    <tr key={p.name} className="border-b border-white/5"><td className="px-4 py-3">{p.name}</td><td className="px-4 py-3 text-right">{p.qty}</td><td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(p.total)}</td></tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
