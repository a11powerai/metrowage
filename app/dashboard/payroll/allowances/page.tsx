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
    frequency: z.enum(["Monthly", "Weekly", "Daily", "OneTime"]),
});
type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

const freqColors: Record<string, string> = {
    Monthly: "bg-blue-100 text-blue-700",
    Weekly: "bg-indigo-100 text-indigo-700",
    Daily: "bg-green-100 text-green-700",
    OneTime: "bg-orange-100 text-orange-700",
};

export default function AllowancesPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [allowances, setAllowances] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { frequency: "Monthly" },
    });

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
    const del = async (id: number) => {
        if (!confirm("Remove this allowance?")) return;
        await fetch(`/api/payroll/allowances/${id}`, { method: "DELETE" }); load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Allowances</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Define recurring or one-time allowances per worker</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ frequency: "Monthly" }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Allowance
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Allowance</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className={labelCls}>Worker</label>
                            <select {...register("workerId")} className={inputCls}>
                                <option value="">— Select Worker —</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-500 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Allowance Name</label>
                            <input {...register("name")} placeholder="Transport Allowance" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Amount (Rs.)</label>
                            <input type="number" {...register("amount")} className={inputCls} />
                            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Frequency</label>
                            <select {...register("frequency")} className={inputCls}>
                                <option value="Monthly">Monthly</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Daily">Daily</option>
                                <option value="OneTime">One Time</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                                {loading ? "Saving…" : "Add Allowance"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Allowance</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Amount</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Frequency</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allowances.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No allowances defined.</td></tr>}
                        {allowances.map((a: any) => {
                            const worker = workers.find(w => w.id === a.workerId);
                            return (
                                <tr key={a.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-800">{worker?.name ?? "—"}</td>
                                    <td className="px-4 py-3 text-gray-600">{a.name}</td>
                                    <td className="px-4 py-3 text-right text-green-600 font-semibold">{formatCurrency(a.amount)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${freqColors[a.frequency] ?? "bg-gray-100 text-gray-500"}`}>
                                            {a.frequency}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => del(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
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
