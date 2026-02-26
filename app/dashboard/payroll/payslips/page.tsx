"use client";
import { useEffect, useState, Suspense } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface AssemblyLine {
    id: number;
    date: string;
    productName: string;
    quantity: number;
    appliedRate: number;
    lineTotal: number;
}

interface PayrollRecord {
    id: number;
    worker: { name: string };
    basicSalary: number;
    overtimeHours: number;
    overtimePay: number;
    allowancesTotal: number;
    commissionsTotal: number;
    assemblyEarnings: number;
    deductionsTotal: number;
    grossPay: number;
    netPay: number;
    assemblyLines: AssemblyLine[];
    allowanceLines: { id: number; name: string; amount: number }[];
    deductionLines: { id: number; type: string; description: string; amount: number }[];
    commissionLines: { id: number; series: string; amount: number }[];
}

function groupByDate(lines: AssemblyLine[]): Record<string, AssemblyLine[]> {
    return lines.reduce((acc, line) => {
        const dateKey = line.date.split("T")[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(line);
        return acc;
    }, {} as Record<string, AssemblyLine[]>);
}

function PayslipsContent() {
    const searchParams = useSearchParams();
    const initialPeriodId = searchParams.get("periodId");
    const [periods, setPeriods] = useState<any[]>([]);
    const [period, setPeriod] = useState<any>(null);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(initialPeriodId ?? "");
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/payroll/periods").then(r => r.json()).then(setPeriods);
    }, []);

    useEffect(() => {
        if (selectedPeriodId) {
            setLoading(true);
            fetch(`/api/payroll/periods/${selectedPeriodId}`).then(r => r.json()).then(d => { setPeriod(d); setLoading(false); });
        }
    }, [selectedPeriodId]);

    const exportPayslipPDF = async (record: PayrollRecord) => {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(16); doc.text("MetroWage — Payslip", 14, y); y += 10;
        doc.setFontSize(11);
        doc.text(`Worker: ${record.worker.name} | Period: ${period?.name}`, 14, y); y += 8;
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, y); y += 12;

        doc.setFontSize(12); doc.text("EARNINGS", 14, y); y += 8;
        doc.setFontSize(9);
        doc.text(`Basic Salary:                 Rs. ${record.basicSalary.toLocaleString()}`, 14, y); y += 6;
        doc.text(`Overtime (${record.overtimeHours}h × OT rate): Rs. ${record.overtimePay.toLocaleString()}`, 14, y); y += 6;
        record.allowanceLines.forEach((a: any) => { doc.text(`${a.name}: Rs. ${a.amount.toLocaleString()}`, 14, y); y += 6; });
        record.commissionLines.forEach((c: any) => { doc.text(`Commission (${c.series}): Rs. ${c.amount.toLocaleString()}`, 14, y); y += 6; });
        
        // Assembly earnings with daily breakdown
        doc.text(`Assembly Earnings:             Rs. ${record.assemblyEarnings.toLocaleString()}`, 14, y); y += 6;
        
        const assemblyByDate = groupByDate(record.assemblyLines);
        Object.entries(assemblyByDate).forEach(([date, lines]) => {
            doc.setFontSize(8);
            doc.text(`  ${new Date(date).toLocaleDateString()}`, 16, y); y += 5;
            doc.setFontSize(9);
            lines.forEach((l: any) => {
                doc.text(`    → ${l.productName}: ${l.quantity} × Rs.${l.appliedRate} = Rs.${l.lineTotal.toLocaleString()}`, 18, y); y += 5;
            });
        });
        
        y += 4;
        doc.setFontSize(11); doc.text(`Gross Pay: Rs. ${record.grossPay.toLocaleString()}`, 14, y); y += 10;
        doc.setFontSize(12); doc.text("DEDUCTIONS", 14, y); y += 8;
        doc.setFontSize(9);
        record.deductionLines.forEach((d: any) => { doc.text(`${d.type} - ${d.description}: Rs. ${d.amount.toLocaleString()}`, 14, y); y += 6; });
        y += 4;
        doc.setFontSize(13); doc.text(`NET PAY: Rs. ${record.netPay.toLocaleString()}`, 14, y);
        doc.save(`payslip-${record.worker.name.replace(/\s/g, "_")}-${period?.name}.pdf`);
    };

    const exportSummaryExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = period?.records?.map((r: any) => ({
            Worker: r.worker.name,
            "Basic Salary": r.basicSalary,
            "OT Pay": r.overtimePay,
            "Allowances": r.allowancesTotal,
            "Commissions": r.commissionsTotal,
            "Assembly Earnings": r.assemblyEarnings,
            "Gross Pay": r.grossPay,
            "Deductions": r.deductionsTotal,
            "Net Pay": r.netPay,
        }));
        const ws = XLSX.utils.json_to_sheet(rows ?? []);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
        XLSX.writeFile(wb, `metrowage-payroll-${period?.name}.xlsx`);
    };

    const factoryTotal = period?.records?.reduce((s: number, r: any) => s + r.netPay, 0) ?? 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Payslips</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Detailed itemized payslips with daily assembly earnings breakdown</p>
                </div>
                {period && (
                    <button onClick={exportSummaryExcel} className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors">
                        <Download className="w-3.5 h-3.5" /> Excel Summary
                    </button>
                )}
            </div>

            <div className="flex items-center gap-3 mb-6">
                <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Select payroll period</option>
                    {periods.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {period && <div className="text-slate-400 text-sm">Factory Total Payout: <span className="text-white font-bold">{formatCurrency(factoryTotal)}</span></div>}
            </div>

            {loading && <div className="text-slate-400 text-sm">Loading payslips…</div>}

            {period?.records?.map((record: PayrollRecord) => {
                const assemblyByDate = groupByDate(record.assemblyLines);
                const sortedDates = Object.keys(assemblyByDate).sort();
                
                return (
                    <div key={record.id} className="bg-slate-800/50 border border-white/10 rounded-xl mb-4 overflow-hidden">
                        {/* Header row */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xs font-bold">
                                    {record.worker.name[0]}
                                </div>
                                <div><div className="font-semibold">{record.worker.name}</div></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right text-xs text-slate-400">Net Pay <div className="text-green-400 text-base font-bold">{formatCurrency(record.netPay)}</div></div>
                                <div className="flex gap-2">
                                    <button onClick={() => exportPayslipPDF(record)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-xs transition-colors"><Download className="w-3 h-3" /> PDF</button>
                                    <button onClick={() => setExpanded(expanded === record.id ? null : record.id)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                                        {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {expanded === record.id && (
                            <div className="p-4 grid md:grid-cols-2 gap-6">
                                {/* Earnings */}
                                <div>
                                    <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Earnings</h3>
                                    <div className="space-y-1.5 text-sm">
                                        {record.basicSalary > 0 && <div className="flex justify-between"><span>Basic Salary</span><span className="text-green-400">{formatCurrency(record.basicSalary)}</span></div>}
                                        {record.overtimePay > 0 && <div className="flex justify-between"><span>Overtime ({record.overtimeHours}h)</span><span className="text-green-400">{formatCurrency(record.overtimePay)}</span></div>}
                                        {record.allowanceLines.map((a: any) => (
                                            <div key={a.id} className="flex justify-between"><span>{a.name}</span><span className="text-green-400">{formatCurrency(a.amount)}</span></div>
                                        ))}
                                        {record.commissionLines.map((c: any) => (
                                            <div key={c.id} className="flex justify-between"><span>Commission ({c.series})</span><span className="text-green-400">{formatCurrency(c.amount)}</span></div>
                                        ))}
                                        {record.assemblyEarnings > 0 && (
                                            <>
                                                <div className="pt-1 border-t border-white/10">
                                                    <div className="flex justify-between font-medium"><span>Assembly Piece Earnings</span><span className="text-blue-400">{formatCurrency(record.assemblyEarnings)}</span></div>
                                                    <div className="mt-2 space-y-2">
                                                        {sortedDates.map(date => (
                                                            <div key={date} className="bg-slate-900/50 rounded-lg p-2">
                                                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                                                                    <Calendar className="w-3 h-3" />
                                                                    {formatDate(date)}
                                                                </div>
                                                                <div className="ml-2 space-y-1">
                                                                    {assemblyByDate[date].map((l: any) => (
                                                                        <div key={l.id} className="text-xs flex justify-between">
                                                                            <span className="text-slate-300">{l.productName} – {l.quantity} units × Rs.{l.appliedRate}</span>
                                                                            <span className="text-green-400">Rs. {l.lineTotal.toLocaleString()}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                        <div className="pt-2 border-t border-white/10 flex justify-between font-semibold text-base">
                                            <span>Gross Pay</span><span className="text-white">{formatCurrency(record.grossPay)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Deductions + Net */}
                                <div>
                                    <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Deductions</h3>
                                    <div className="space-y-1.5 text-sm">
                                        {record.deductionLines.length === 0 && <p className="text-slate-500 text-xs">No deductions</p>}
                                        {record.deductionLines.map((d: any) => (
                                            <div key={d.id} className="flex justify-between"><span>{d.type} — {d.description}</span><span className="text-red-400">- {formatCurrency(d.amount)}</span></div>
                                        ))}
                                        <div className="pt-2 border-t border-white/10 flex justify-between font-semibold text-base">
                                            <span>Total Deductions</span><span className="text-red-400">- {formatCurrency(record.deductionsTotal)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                                        <div className="text-xs text-slate-400 mb-1">NET PAY</div>
                                        <div className="text-2xl font-bold text-green-400">{formatCurrency(record.netPay)}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function PayslipsPage() {
    return <Suspense fallback={<div className="text-slate-400 text-sm">Loading…</div>}><PayslipsContent /></Suspense>;
}
