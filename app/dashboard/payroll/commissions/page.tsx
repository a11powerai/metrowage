"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod"; import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, CheckCircle, Trash2, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const schema = z.object({
    workerId: z.coerce.number().min(1),
    series: z.string().min(1),
    amount: z.coerce.number().min(1),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
});
type CommissionFormData = z.infer<typeof schema>;
const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";

const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function CommissionsPage() {

    const [workers, setWorkers] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CommissionFormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { periodStart: today, periodEnd: today }
    });

    const load = async () => {
        const [wRes, cRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/commissions")]);
        setWorkers(await wRes.json()); setCommissions(await cRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: CommissionFormData) => {

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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Series commissions — must be approved before payroll generation</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ periodStart: today, periodEnd: today }); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Commission
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Commission</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Worker</label>
                            <select {...register("workerId")} className={inputCls}>
                                <option value="">Select</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Series Name</label>
                            <input {...register("series")} placeholder="e.g. Series A" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Amount (Rs.)</label>
                            <input type="number" {...register("amount")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Period Start</label>
                            <input type="date" {...register("periodStart")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Period End</label>
                            <input type="date" {...register("periodEnd")} className={inputCls} />
                        </div>
                        <div className="flex items-end gap-3 lg:col-span-1">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors shadow-sm">
                                {loading ? "Saving…" : "Add"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Series</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Amount</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commissions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No commissions added yet.</td></tr>}
                        {commissions.map((c: any) => {
                            const worker = workers.find(w => w.id === c.workerId);
                            return (
                                <tr key={c.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800">{worker?.name ?? "—"}</td>
                                    <td className="px-4 py-3 text-purple-600 font-medium">{c.series}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(c.amount)}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => approve(c.id, c.approved)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${c.approved ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600"}`}>
                                            <CheckCircle className="w-3 h-3" />{c.approved ? "Approved" : "Pending — Click to Approve"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
