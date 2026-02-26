"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function YearlyReportPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/yearly?year=${year}`);
        setData(await res.json());
        setLoading(false);
    };

    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = data?.months?.map((m: any) => ({ Month: MONTHS[m.month - 1], "Factory Payout (Rs.)": m.total, "Working Days": m.days })) ?? [];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Yearly Report");
        XLSX.writeFile(wb, `metrowage-yearly-${year}.xlsx`);
    };

    const chartData = data?.months?.map((m: any) => ({ name: MONTHS[m.month - 1], payout: m.total })) ?? [];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Yearly Report</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Month-wise summary for the year</p>
                </div>
                {data && <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"><Download className="w-3.5 h-3.5" /> Excel</button>}
            </div>

            <div className="flex items-center gap-3 mb-6">
                <input type="number" value={year} min={2020} max={2100} onChange={e => setYear(Number(e.target.value))} className="w-28 px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={load} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                    {loading ? "Loading…" : "Generate"}
                </button>
            </div>

            {data && (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Annual Factory Total</div>
                            <div className="text-2xl font-bold text-green-400">{formatCurrency(data.yearTotal)}</div>
                        </div>
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">Total Working Days</div>
                            <div className="text-2xl font-bold">{data.totalDays}</div>
                        </div>
                    </div>

                    {chartData.length > 0 && (
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl p-4 mb-6">
                            <h2 className="font-semibold mb-4 text-sm">Monthly Payout Trend</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(v: any) => [`Rs. ${v}`, "Payout"]} />
                                    <Line type="monotone" dataKey="payout" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#3b82f6" }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/10 font-semibold text-sm">Month-wise Breakdown</div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-white/10"><th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">Month</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Days</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Payout</th></tr></thead>
                                <tbody>
                                    {data.months?.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-slate-500">No data.</td></tr>}
                                    {data.months?.map((m: any) => (
                                        <tr key={m.month} className="border-b border-white/5"><td className="px-4 py-3">{MONTHS[m.month - 1]}</td><td className="px-4 py-3 text-right">{m.days}</td><td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(m.total)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-white/10 font-semibold text-sm">Worker Annual Earnings</div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-white/10"><th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs">Worker</th><th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs">Total</th></tr></thead>
                                <tbody>
                                    {data.workers?.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-slate-500">No data.</td></tr>}
                                    {data.workers?.map((w: any) => (
                                        <tr key={w.name} className="border-b border-white/5"><td className="px-4 py-3">{w.name}</td><td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(w.total)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
