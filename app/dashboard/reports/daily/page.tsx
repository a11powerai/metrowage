"use client";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download } from "lucide-react";

export default function DailyReportPage() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/daily?date=${date}`);
        setData(await res.json());
        setLoading(false);
    };

    const exportPDF = async () => {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        doc.setFontSize(16); doc.text("MetroWage — Daily Production Report", 14, 20);
        doc.setFontSize(11); doc.text(`Date: ${formatDate(date)}`, 14, 30);
        let y = 45;
        data?.workers?.forEach((w: any) => {
            doc.setFontSize(12); doc.text(w.name, 14, y); y += 8;
            w.lines.forEach((l: any) => {
                doc.setFontSize(9);
                doc.text(`  ${l.product} | Qty: ${l.quantity} | Rate: Rs.${l.appliedRate} | Total: Rs.${l.lineTotal}`, 14, y);
                y += 6;
            });
            doc.setFontSize(10); doc.text(`  Worker Total: Rs.${w.total}`, 14, y); y += 10;
        });
        doc.setFontSize(12); doc.text(`Factory Total: Rs.${data?.factoryTotal}`, 14, y);
        doc.save(`metrowage-daily-${date}.pdf`);
    };

    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = data?.workers?.flatMap((w: any) =>
            w.lines.map((l: any) => ({
                Worker: w.name,
                Product: l.product,
                Quantity: l.quantity,
                "Rate (Rs.)": l.appliedRate,
                "Line Total (Rs.)": l.lineTotal,
            }))
        ) ?? [];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Report");
        XLSX.writeFile(wb, `metrowage-daily-${date}.xlsx`);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Daily Report</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Worker-wise production breakdown</p>
                </div>
                {data && (
                    <div className="flex gap-2">
                        <button onClick={exportPDF} className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"><Download className="w-3.5 h-3.5" /> PDF</button>
                        <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition-colors shadow-sm"><Download className="w-3.5 h-3.5" /> Excel</button>
                    </div>
                )}
            </div>


            <div className="flex items-center gap-3 mb-6">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800" />
                <button onClick={load} disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                    {loading ? "Loading…" : "Generate Report"}
                </button>
            </div>


            {data && (
                <>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="text-gray-500 text-sm">Status: <span className={`font-bold ${data.status === "Finalized" ? "text-emerald-600" : "text-amber-600"}`}>{data.status || "No Day Found"}</span></div>
                        <div className="text-gray-500 text-sm">Factory Total: <span className="text-gray-900 font-bold">{formatCurrency(data.factoryTotal)}</span></div>
                    </div>

                    {data.workers?.length === 0 && <p className="text-gray-400 text-sm py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">No entries for this date.</p>}


                    {data.workers?.map((w: any) => (
                        <div key={w.name} className="bg-white border border-purple-100 rounded-2xl mb-4 overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-purple-50 bg-purple-25">
                                <span className="font-semibold text-gray-800">{w.name}</span>
                                <span className="text-emerald-600 font-bold">{formatCurrency(w.total)}</span>
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-purple-50">
                                        <th className="text-left px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Product</th>
                                        <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Qty</th>
                                        <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Rate</th>
                                        <th className="text-right px-4 py-2.5 text-gray-400 font-medium text-[10px] uppercase tracking-wider">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {w.lines.map((l: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-purple-25/30 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-700">{l.product}</td>
                                            <td className="px-4 py-2.5 text-right text-gray-600 font-medium">{l.quantity}</td>
                                            <td className="px-4 py-2.5 text-right text-blue-600">Rs. {l.appliedRate}</td>
                                            <td className="px-4 py-2.5 text-right text-emerald-600 font-bold">{formatCurrency(l.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}

                </>
            )}
        </div>
    );
}
