"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Play, Lock, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

const schema = z.object({
    name: z.string().min(1, "Period name required"),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
});
type RunFormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function RunPayrollPage() {

    const [periods, setPeriods] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<RunFormData>({ resolver: zodResolver(schema), defaultValues: { periodStart: today, periodEnd: today } });


    const load = async () => {
        const [pRes, wRes] = await Promise.all([fetch("/api/payroll/periods"), fetch("/api/workers")]);
        setPeriods(await pRes.json()); setWorkers(await wRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: RunFormData) => {

        setLoading(true); setMsg(null);
        const res = await fetch("/api/payroll/periods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            setMsg({ type: "success", text: "Payroll generated successfully! View in Payslips." });
            reset({ periodStart: today, periodEnd: today }); setShowForm(false); load();
        } else {
            const j = await res.json();
            setMsg({ type: "error", text: j.error ?? "Error generating payroll" });
        }
        setLoading(false);
    };

    const finalize = async (id: number) => {
        if (!confirm("Finalize this payroll period? It will be locked.")) return;
        await fetch(`/api/payroll/periods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Finalized" }) });
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Run Payroll</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Generate payroll periods — auto-includes assembly earnings, allowances, commissions, and deductions</p>
                </div>
                <button onClick={() => { setShowForm(true); setMsg(null); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Play className="w-4 h-4" /> Generate Payroll
                </button>
            </div>


            {msg && (
                <div className={`px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between font-medium ${msg.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
                    {msg.text}
                    <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}


            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Payroll Period</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-sm text-blue-700">
                        <strong>ℹ Assembly earnings</strong> will be automatically pulled from all <em>Finalized</em> production days within the selected period. Only approved commissions and pending deductions will be included.
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className={labelCls}>Period Name</label>
                            <input {...register("name")} placeholder="e.g. February 2026" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Period Start</label>
                            <input type="date" {...register("periodStart")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Period End</label>
                            <input type="date" {...register("periodEnd")} className={inputCls} />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={loading} className="w-full px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors shadow-sm">
                                {loading ? "Generating…" : "Generate for All Workers"}
                            </button>
                        </div>
                    </form>
                </div>
            )}


            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Period</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Date Range</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Workers</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No payroll periods generated yet.</td></tr>}
                        {periods.map((p: any) => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">{p._count?.records ?? 0}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Finalized" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {p.status === "Finalized" ? <Lock className="w-3 h-3" /> : null}{p.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                    <Link href={`/dashboard/payroll/payslips?periodId=${p.id}`} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">View Payslips</Link>
                                    {p.status !== "Finalized" && (
                                        <button onClick={() => finalize(p.id)} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">Finalize</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
