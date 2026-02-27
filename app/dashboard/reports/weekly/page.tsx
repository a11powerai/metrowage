"use client";
import { useEffect, useState } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { Download, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function WeeklyReportPage() {
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

    const load = async () => {
        setLoading(true);
        const from = format(weekStart, "yyyy-MM-dd");
        const to = format(weekEnd, "yyyy-MM-dd");
        const res = await fetch(`/api/reports/weekly?from=${from}&to=${to}`);
        setData(await res.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, [weekStart]);

    const totals = data.reduce((acc, w) => ({
        qty: acc.qty + (w.totalQty ?? 0),
        earnings: acc.earnings + (w.totalEarnings ?? 0),
    }), { qty: 0, earnings: 0 });

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Weekly Production Report</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Worker-wise production with all products and earnings</p>
                </div>
            </div>

            {/* Week Selector */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 bg-white border border-purple-200 rounded-xl text-sm font-medium text-gray-800 min-w-[240px] text-center">
                    {format(weekStart, "dd MMM")} – {format(weekEnd, "dd MMM yyyy")}
                </div>
                <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:border-purple-300 hover:text-purple-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-purple-700">{data.length}</div>
                    <div className="text-gray-500 text-xs">Workers Active</div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-green-700">{totals.qty.toLocaleString()}</div>
                    <div className="text-gray-500 text-xs">Total Units Produced</div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <div className="text-2xl font-bold text-blue-700">{formatCurrency(totals.earnings)}</div>
                    <div className="text-gray-500 text-xs">Total Production Allowance</div>
                </div>
            </div>

            {loading && <div className="text-center py-10 text-gray-400">Loading…</div>}

            {!loading && data.length === 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                    No production data for this week.
                </div>
            )}

            {!loading && data.map((worker: any) => (
                <div key={worker.workerId} className="bg-white border border-purple-100 rounded-2xl mb-4 overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-5 py-3 bg-purple-50 border-b border-purple-100">
                        <div>
                            <span className="font-semibold text-gray-800">{worker.name}</span>
                            <span className="ml-2 text-purple-500 font-mono text-xs">{worker.workerId}</span>
                            {worker.designation && <span className="ml-2 text-gray-400 text-xs">· {worker.designation}</span>}
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-purple-700">{formatCurrency(worker.totalEarnings ?? 0)}</div>
                            <div className="text-xs text-gray-400">{worker.totalQty ?? 0} units total</div>
                        </div>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="text-left px-5 py-2 text-gray-400 text-xs font-medium">Date</th>
                                <th className="text-left px-5 py-2 text-gray-400 text-xs font-medium">Product</th>
                                <th className="text-right px-5 py-2 text-gray-400 text-xs font-medium">Qty</th>
                                <th className="text-right px-5 py-2 text-gray-400 text-xs font-medium">Rate</th>
                                <th className="text-right px-5 py-2 text-gray-400 text-xs font-medium">Earnings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(worker.lines ?? []).map((line: any, i: number) => (
                                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-purple-25">
                                    <td className="px-5 py-2 text-gray-600 text-xs">{format(new Date(line.date), "EEE, dd MMM")}</td>
                                    <td className="px-5 py-2 text-gray-700">{line.productName}</td>
                                    <td className="px-5 py-2 text-right text-gray-700">{line.quantity}</td>
                                    <td className="px-5 py-2 text-right text-gray-500 text-xs">{formatCurrency(line.appliedRate)}/u</td>
                                    <td className="px-5 py-2 text-right font-medium text-purple-600">{formatCurrency(line.lineTotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}
