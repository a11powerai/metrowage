"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Download, Building2 } from "lucide-react";

export default function SalaryReportPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [periodId, setPeriodId] = useState<string>("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/payroll/periods").then(res => res.json()).then(data => {
            setPeriods(data);
            if (data.length > 0) setPeriodId(data[0].id.toString());
        });
    }, []);

    const load = async () => {
        if (!periodId) return;
        setLoading(true);
        const res = await fetch(`/api/reports/salary?periodId=${periodId}`);
        setData(await res.json());
        setLoading(false);
    };

    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = data?.locations?.map((l: any) => ({ 
            "Factory": l.factory,
            "Location": l.location,
            "Workers": l.workerCount,
            "Basic Salary (Rs.)": l.basicSalary,
            "Overtime (Rs.)": l.overtimePay,
            "Assembly (Rs.)": l.assemblyEarnings,
            "Other Additions (Rs.)": l.allowances + l.commissions,
            "Gross Pay (Rs.)": l.grossPay,
            "Deductions (Rs.)": l.deductions,
            "Net Pay (Rs.)": l.netPay
        })) ?? [];
        
        // Add Overall Row
        if (data?.overall) {
            rows.push({
                "Factory": "OVERALL",
                "Location": "ALL",
                "Workers": data.overall.workerCount,
                "Basic Salary (Rs.)": data.overall.basicSalary,
                "Overtime (Rs.)": "",
                "Assembly (Rs.)": "",
                "Other Additions (Rs.)": "",
                "Gross Pay (Rs.)": data.overall.grossPay,
                "Deductions (Rs.)": data.overall.deductions,
                "Net Pay (Rs.)": data.overall.netPay
            });
        }
        
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Salary Report");
        XLSX.writeFile(wb, `metrowage-salary-report-${data?.periodName?.replace(/ /g, "_")}.xlsx`);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Salary Report by Location</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Consolidated payroll summary grouped by factory and location</p>
                </div>
                {data && <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"><Download className="w-3.5 h-3.5" /> Export Excel</button>}
            </div>

            <div className="flex items-center gap-3 mb-6">
                <select value={periodId} onChange={e => setPeriodId(e.target.value)} className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 min-w-[200px]">
                    <option value="">Select Payroll Period</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name} ({p.status})</option>)}
                </select>
                <button onClick={load} disabled={loading || !periodId} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                    {loading ? "Loading…" : "Generate Report"}
                </button>
            </div>

            {data && data.overall && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                            <div className="text-xs text-purple-600 font-medium mb-1 tracking-wider uppercase">Total Net Payout</div>
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(data.overall.netPay)}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="text-xs text-gray-500 font-medium mb-1 tracking-wider uppercase">Total Gross</div>
                            <div className="text-2xl font-bold text-gray-900">{formatCurrency(data.overall.grossPay)}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="text-xs text-gray-500 font-medium mb-1 tracking-wider uppercase">Total Deductions</div>
                            <div className="text-2xl font-bold text-rose-600">{formatCurrency(data.overall.deductions)}</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-4">
                            <div className="text-xs text-gray-500 font-medium mb-1 tracking-wider uppercase">Total Workers</div>
                            <div className="text-2xl font-bold text-gray-900">{data.overall.workerCount}</div>
                        </div>
                    </div>

                    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-purple-50 bg-purple-25 font-semibold text-sm text-gray-800 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-purple-600" /> Location Breakdown
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-purple-50">
                                        <th className="text-left px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Factory — Location</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Workers</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Basic Salary</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Overtime</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Additions</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Gross</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Deductions</th>
                                        <th className="text-right px-4 py-3 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Net Pay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.locations?.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">No data found.</td></tr>}
                                    {data.locations?.map((l: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-purple-25/50">
                                            <td className="px-4 py-3 font-medium text-gray-700">
                                                <div className="text-sm">{l.factory}</div>
                                                <div className="text-[10px] text-gray-400">{l.location}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right">{l.workerCount}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(l.basicSalary)}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(l.overtimePay)}</td>
                                            <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(l.allowances + l.commissions + l.assemblyEarnings)}</td>
                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(l.grossPay)}</td>
                                            <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(l.deductions)}</td>
                                            <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(l.netPay)}</td>
                                        </tr>
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
