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
                    <h1 className="text-2xl font-bold text-gray-900">Yearly Report</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Month-wise summary for the year</p>
                </div>
                {data && <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"><Download className="w-3.5 h-3.5" /> Excel</button>}
            </div>


            <div className="flex items-center gap-3 mb-6">
                <input type="number" value={year} min={2020} max={2100} onChange={e => setYear(Number(e.target.value))} className="w-28 px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800" />
                <button onClick={load} disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                    {loading ? "Loading…" : "Generate"}
                </button>
            </div>


            {data && (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-purple-600 font-medium mb-1 uppercase tracking-wider">Annual Factory Total</div>
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.yearTotal)}</div>
                        </div>
                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 shadow-sm">
                            <div className="text-xs text-purple-600 font-medium mb-1 uppercase tracking-wider">Total Working Days</div>
                            <div className="text-2xl font-bold text-gray-900">{data.totalDays}</div>
                        </div>
                    </div>


                    {chartData.length > 0 && (
                        <div className="bg-white border border-purple-100 rounded-2xl p-4 mb-6 shadow-sm">
                            <h2 className="font-semibold mb-4 text-sm text-gray-800 uppercase tracking-tight">Monthly Payout Trend</h2>
                            <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
                                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e9d5ff", borderRadius: 12, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} labelStyle={{ color: "#374151", fontWeight: "bold" }} formatter={(v: any) => [`Rs. ${v}`, "Payout"]} />

                                    <Line type="monotone" dataKey="payout" stroke="#9333ea" strokeWidth={3} dot={{ r: 5, fill: "#9333ea", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}


                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-4 py-3 border-b border-purple-50 bg-purple-25 font-semibold text-sm text-gray-800">Month-wise Breakdown</div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-purple-50"><th className="text-left px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Month</th><th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Days</th><th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Payout</th></tr></thead>
                                <tbody>
                                    {data.months?.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">No data.</td></tr>}
                                    {data.months?.map((m: any) => (
                                        <tr key={m.month} className="border-b border-gray-50 hover:bg-purple-25/50 transition-colors"><td className="px-4 py-3 text-gray-700 font-medium">{MONTHS[m.month - 1]}</td><td className="px-4 py-3 text-right text-gray-600">{m.days}</td><td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(m.total)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-4 py-3 border-b border-purple-50 bg-purple-25 font-semibold text-sm text-gray-800">Worker Annual Earnings Summary</div>
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-purple-50"><th className="text-left px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Worker</th><th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Total</th></tr></thead>
                                <tbody>
                                    {data.workers?.length === 0 && <tr><td colSpan={2} className="text-center py-8 text-gray-400">No data.</td></tr>}
                                    {data.workers?.map((w: any) => (
                                        <tr key={w.name} className="border-b border-gray-50 hover:bg-purple-25/50 transition-colors"><td className="px-4 py-3 text-gray-700">{w.name}</td><td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(w.total)}</td></tr>
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
