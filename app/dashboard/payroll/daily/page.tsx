"use client";
import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calendar, Download } from "lucide-react";

export default function DailySalaryPage() {
    const today = new Date().toISOString().split("T")[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        const res = await fetch(`/api/payroll/daily?startDate=${startDate}&endDate=${endDate}`);
        const data = await res.json();
        setResults(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [startDate, endDate]);

    const exportToExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = results.map((r: any) => ({
            "Worker ID": r.workerId,
            Worker: r.workerName,
            Factory: r.factoryName,
            Location: r.locationName,
            "Worker Type": r.workerType,
            "Salary Frequency": r.salaryFrequency,
            "Days Present": r.presentDays,
            "Base Salary (Rs.)": r.baseSalary,
            "Allow Overtime": r.allowOvertime ? "Yes" : "No",
            "OT Hours": r.overtimeHours,
            "OT Pay (Rs.)": r.overtimePay,
            "Total Base+OT (Rs.)": r.baseSalary + r.overtimePay,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Base Salary processing");
        XLSX.writeFile(wb, `metrowage-base-salary-${startDate}-to-${endDate}.xlsx`);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Base Salary Processing</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Calculate base salary and overtime based on attendance for any period</p>
                </div>
                <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Download className="w-4 h-4" /> Export Report
                </button>
            </div>

            <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm flex items-end gap-4">
                <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Period Start</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block font-medium">Period End</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <button onClick={load} disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-60">
                    {loading ? "Calculating…" : "Calculate Period"}
                </button>
            </div>

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50 bg-purple-25">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Factory/Location</th>
                            <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Days Attended</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Base Salary</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">OT Pay <span className="text-[10px] text-gray-400 normal-case ml-1">(Hours)</span></th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Base + OT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.length === 0 && !loading && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No active workers found for calculation.</td></tr>
                        )}
                        {loading && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">Crunching numbers…</td></tr>
                        )}
                        {!loading && results.map((r: any) => (
                            <tr key={r.workerId} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-gray-800">{r.workerName}</div>
                                    <div className="text-xs text-gray-400">{r.workerType} — {r.salaryFrequency}</div>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600">
                                    <div>{r.factoryName}</div>
                                    <div className="text-gray-400">{r.locationName}</div>
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-gray-700">{r.presentDays}</td>
                                <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(r.baseSalary)}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="font-medium text-blue-600">{formatCurrency(r.overtimePay)}</div>
                                    <div className="text-xs text-gray-400">{r.overtimeHours}h {r.allowOvertime ? "" : "(No OT)"}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 bg-gray-50/50">{formatCurrency(r.baseSalary + r.overtimePay)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
