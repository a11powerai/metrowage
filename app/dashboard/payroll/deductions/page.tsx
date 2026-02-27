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
type DeductionFormData = z.infer<typeof schema>;

const TYPE_COLORS: Record<string, string> = {
    Loan: "bg-red-100 text-red-700",
    Advance: "bg-orange-100 text-orange-700",
    Statutory: "bg-amber-100 text-amber-700",
    Penalty: "bg-rose-100 text-rose-700",
    Other: "bg-gray-100 text-gray-700",
};

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function DeductionsPage() {

    const [workers, setWorkers] = useState<any[]>([]);
    const [deductions, setDeductions] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<DeductionFormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { type: "Loan", periodStart: today, periodEnd: today }
    });

    const load = async () => {
        const [wRes, dRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/deductions")]);
        setWorkers(await wRes.json()); setDeductions(await dRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: DeductionFormData) => {
        setLoading(true);
        await fetch("/api/payroll/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        reset({ type: "Loan", periodStart: today, periodEnd: today }); setShowForm(false); setLoading(false); load();
    };

    const del = async (id: number) => { if (!confirm("Remove?")) return; await fetch(`/api/payroll/deductions/${id}`, { method: "DELETE" }); load(); };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Deductions</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Loans, advances, statutory, penalties per worker per period</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ type: "Loan", periodStart: today, periodEnd: today }); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Deduction
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Deduction</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Worker</label>
                            <select {...register("workerId")} className={inputCls}>
                                <option value="">Select</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-500 text-xs mt-1">Required</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Type</label>
                            <select {...register("type")} className={inputCls}>
                                {["Loan", "Advance", "Statutory", "Penalty", "Other"].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Description</label>
                            <input {...register("description")} placeholder="e.g. EPF deduction" className={inputCls} />
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
                        <div className="lg:col-span-3 flex gap-3">
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
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Type</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Description</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Amount</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deductions.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No deductions defined.</td></tr>}
                        {deductions.map((d: any) => {
                            const worker = workers.find(w => w.id === d.workerId);
                            return (
                                <tr key={d.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800">{worker?.name ?? "—"}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[d.type]}`}>{d.type}</span></td>
                                    <td className="px-4 py-3 text-gray-500">{d.description}</td>
                                    <td className="px-4 py-3 text-right text-red-600 font-bold">- {formatCurrency(d.amount)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => del(d.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
