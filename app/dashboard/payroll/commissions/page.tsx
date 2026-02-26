"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod"; import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CheckCircle, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
    workerId: z.union([z.string(), z.number()]).transform(Number),
    series: z.string().min(1),
    amount: z.union([z.string(), z.number()]).transform(Number),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
});
type FormData = {
    workerId: number;
    series: string;
    amount: number;
    periodStart: string;
    periodEnd: string;
};

export default function CommissionsPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { periodStart: today, periodEnd: today } });
    const load = async () => {
        const [wRes, cRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/commissions")]);
        setWorkers(await wRes.json()); setCommissions(await cRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        await fetch("/api/payroll/commissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, approved: false }) });
        reset({ periodStart: today, periodEnd: today }); setShowForm(false); setLoading(false); load();
    };
    const approve = async (id: number, approved: boolean) => {
        await fetch(`/api/payroll/commissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: !approved }) }); load();
    };
    const del = async (id: number) => { if (!confirm("Remove?")) return; await fetch(`/api/payroll/commissions/${id}`, { method: "DELETE" }); load(); };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold">Commissions</h1><p className="text-slate-400 text-sm mt-0.5">Series commissions — must be approved before payroll generation</p></div>
                <button onClick={() => { setShowForm(true); reset({ periodStart: today, periodEnd: today }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Add Commission</button>
            </div>
            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex justify-between mb-4"><h2 className="font-semibold">New Commission</h2><button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div><label className="text-xs text-slate-400 mb-1 block">Worker</label>
                            <select {...register("workerId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select</option>{workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Series Name</label>
                            <input {...register("series")} placeholder="e.g. Series A" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Amount (Rs.)</label>
                            <input type="number" {...register("amount")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Period Start</label>
                            <input type="date" {...register("periodStart")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Period End</label>
                            <input type="date" {...register("periodEnd")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" /></div>
                        <div className="flex items-end gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">{loading ? "Saving…" : "Add"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm"><thead><tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Worker</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Series</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr></thead>
                    <tbody>
                        {commissions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No commissions added yet.</td></tr>}
                        {commissions.map((c: any) => {
                            const worker = workers.find(w => w.id === c.workerId);
                            return (<tr key={c.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-3">{worker?.name ?? "—"}</td>
                                <td className="px-4 py-3 text-purple-400 font-medium">{c.series}</td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(c.amount)}</td>
                                <td className="px-4 py-3">
                                    <button onClick={() => approve(c.id, c.approved)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.approved ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400 hover:bg-green-500/20 hover:text-green-400"}`}>
                                        <CheckCircle className="w-3 h-3" />{c.approved ? "Approved" : "Pending — Click to Approve"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right"><button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
                            </tr>);
                        })}
                    </tbody></table>
            </div>
        </div>
    );
}
