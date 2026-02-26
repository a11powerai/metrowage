"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod"; import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
    workerId: z.coerce.number().min(1),
    type: z.enum(["Loan", "Advance", "Statutory", "Penalty", "Other"]),
    description: z.string().min(1),
    amount: z.coerce.number().min(1),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
});
type FormData = z.infer<typeof schema>;

const TYPE_COLOR: Record<string, string> = {
    Loan: "bg-red-500/20 text-red-400", Advance: "bg-orange-500/20 text-orange-400",
    Statutory: "bg-yellow-500/20 text-yellow-400", Penalty: "bg-rose-500/20 text-rose-400", Other: "bg-slate-500/20 text-slate-400",
};

export default function DeductionsPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [deductions, setDeductions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { type: "Loan", periodStart: today, periodEnd: today } });
    const load = async () => {
        const [wRes, dRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/deductions")]);
        setWorkers(await wRes.json()); setDeductions(await dRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        await fetch("/api/payroll/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        reset({ type: "Loan", periodStart: today, periodEnd: today }); setShowForm(false); setLoading(false); load();
    };
    const del = async (id: number) => { if (!confirm("Remove?")) return; await fetch(`/api/payroll/deductions/${id}`, { method: "DELETE" }); load(); };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold">Deductions</h1><p className="text-slate-400 text-sm mt-0.5">Loans, advances, statutory, penalties per worker per period</p></div>
                <button onClick={() => { setShowForm(true); reset({ type: "Loan", periodStart: today, periodEnd: today }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Add Deduction</button>
            </div>
            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex justify-between mb-4"><h2 className="font-semibold">New Deduction</h2><button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div><label className="text-xs text-slate-400 mb-1 block">Worker</label>
                            <select {...register("workerId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select</option>{workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>{errors.workerId && <p className="text-red-400 text-xs mt-1">Required</p>}</div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Type</label>
                            <select {...register("type")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                {["Loan", "Advance", "Statutory", "Penalty", "Other"].map(t => <option key={t}>{t}</option>)}
                            </select></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Description</label>
                            <input {...register("description")} placeholder="e.g. EPF deduction" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Amount (Rs.)</label>
                            <input type="number" {...register("amount")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Period Start</label>
                            <input type="date" {...register("periodStart")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Period End</label>
                            <input type="date" {...register("periodEnd")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div className="lg:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">{loading ? "Saving…" : "Add"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm"><thead><tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Worker</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Description</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Action</th>
                </tr></thead>
                    <tbody>
                        {deductions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No deductions defined.</td></tr>}
                        {deductions.map((d: any) => {
                            const worker = workers.find(w => w.id === d.workerId);
                            return (<tr key={d.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-3">{worker?.name ?? "—"}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[d.type]}`}>{d.type}</span></td>
                                <td className="px-4 py-3 text-slate-400">{d.description}</td>
                                <td className="px-4 py-3 text-right text-red-400 font-semibold">- {formatCurrency(d.amount)}</td>
                                <td className="px-4 py-3 text-right"><button onClick={() => del(d.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
                            </tr>);
                        })}
                    </tbody></table>
            </div>
        </div>
    );
}
