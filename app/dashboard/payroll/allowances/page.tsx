"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod"; import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
    workerId: z.coerce.number().min(1, "Select worker"),
    name: z.string().min(1, "Name required"),
    amount: z.coerce.number().min(1, "Amount required"),
    frequency: z.enum(["Monthly", "OneTime"]),
});
type FormData = z.infer<typeof schema>;

export default function AllowancesPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [allowances, setAllowances] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { frequency: "Monthly" } });

    const load = async () => {
        const [wRes, aRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/allowances")]);
        setWorkers(await wRes.json()); setAllowances(await aRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        await fetch("/api/payroll/allowances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        reset({ frequency: "Monthly" }); setShowForm(false); setLoading(false); load();
    };
    const del = async (id: number) => { if (!confirm("Remove this allowance?")) return; await fetch(`/api/payroll/allowances/${id}`, { method: "DELETE" }); load(); };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-2xl font-bold">Allowances</h1><p className="text-slate-400 text-sm mt-0.5">Define recurring or one-time allowances per worker</p></div>
                <button onClick={() => { setShowForm(true); reset({ frequency: "Monthly" }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"><Plus className="w-4 h-4" /> Add Allowance</button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex justify-between mb-4"><h2 className="font-semibold">New Allowance</h2><button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button></div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><label className="text-xs text-slate-400 mb-1 block">Worker</label>
                            <select {...register("workerId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select</option>{workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>{errors.workerId && <p className="text-red-400 text-xs mt-1">{errors.workerId.message}</p>}</div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Allowance Name</label>
                            <input {...register("name")} placeholder="Transport Allowance" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />{errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}</div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Amount (Rs.)</label>
                            <input type="number" {...register("amount")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />{errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}</div>
                        <div><label className="text-xs text-slate-400 mb-1 block">Frequency</label>
                            <select {...register("frequency")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="Monthly">Monthly</option><option value="OneTime">One Time</option>
                            </select></div>
                        <div className="lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">{loading ? "Saving…" : "Add"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm"><thead><tr className="border-b border-white/10">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Worker</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Allowance</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Frequency</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Action</th>
                </tr></thead>
                    <tbody>
                        {allowances.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No allowances defined.</td></tr>}
                        {allowances.map((a: any) => {
                            const worker = workers.find(w => w.id === a.workerId);
                            return (<tr key={a.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-3">{worker?.name ?? "—"}</td>
                                <td className="px-4 py-3">{a.name}</td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(a.amount)}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.frequency === "Monthly" ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"}`}>{a.frequency}</span></td>
                                <td className="px-4 py-3 text-right"><button onClick={() => del(a.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button></td>
                            </tr>);
                        })}
                    </tbody></table>
            </div>
        </div>
    );
}
