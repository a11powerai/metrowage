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
type FormData = z.infer<typeof schema>;

export default function RunPayrollPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { periodStart: today, periodEnd: today } });

    const load = async () => {
        const [pRes, wRes] = await Promise.all([fetch("/api/payroll/periods"), fetch("/api/workers")]);
        setPeriods(await pRes.json()); setWorkers(await wRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
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
                    <h1 className="text-2xl font-bold">Run Payroll</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Generate payroll periods — auto-includes assembly earnings, allowances, commissions, and deductions</p>
                </div>
                <button onClick={() => { setShowForm(true); setMsg(null); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors">
                    <Play className="w-4 h-4" /> Generate Payroll
                </button>
            </div>

            {msg && (
                <div className={`px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between ${msg.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                    {msg.text}
                    <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">New Payroll Period</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4 text-sm text-blue-300">
                        <strong>ℹ Assembly earnings</strong> will be automatically pulled from all <em>Finalized</em> production days within the selected period. Only approved commissions and pending deductions will be included.
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className="text-xs text-slate-400 mb-1 block">Period Name</label>
                            <input {...register("name")} placeholder="e.g. February 2026" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Period Start</label>
                            <input type="date" {...register("periodStart")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Period End</label>
                            <input type="date" {...register("periodEnd")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="flex items-end">
                            <button type="submit" disabled={loading} className="w-full px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors">
                                {loading ? "Generating…" : "Generate for All Workers"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">Period</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">Date Range</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">Workers</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                        {periods.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No payroll periods generated yet.</td></tr>}
                        {periods.map((p: any) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">{p._count?.records ?? 0}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Finalized" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                        {p.status === "Finalized" ? <Lock className="w-3 h-3" /> : null}{p.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                    <Link href={`/dashboard/payroll/payslips?periodId=${p.id}`} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs transition-colors">View Payslips</Link>
                                    {p.status !== "Finalized" && (
                                        <button onClick={() => finalize(p.id)} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded-lg text-xs transition-colors">Finalize</button>
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
