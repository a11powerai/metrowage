"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";

const schema = z.object({
    workerId: z.union([z.string(), z.number()]).transform(Number),
    basicSalary: z.union([z.string(), z.number()]).transform(Number),
    overtimeRate: z.union([z.string(), z.number()]).transform(Number),
    workerType: z.enum(["Salary", "PieceRate", "Both"]),
});
type FormData = {
    workerId: number;
    basicSalary: number;
    overtimeRate: number;
    workerType: "Salary" | "PieceRate" | "Both";
};

export default function SalaryProfilesPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { workerType: "Both" },
    });

    const load = async () => {
        const [wRes, pRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/profiles")]);
        setWorkers(await wRes.json());
        setProfiles(await pRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        await fetch("/api/payroll/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        reset({ workerType: "Both" }); setShowForm(false); setLoading(false); load();
    };

    const startEdit = (p: any) => {
        setValue("workerId", p.workerId);
        setValue("basicSalary", p.basicSalary);
        setValue("overtimeRate", p.overtimeRate);
        setValue("workerType", p.workerType);
        setShowForm(true);
    };

    const TYPE_COLOR: Record<string, string> = {
        Salary: "bg-blue-500/20 text-blue-400",
        PieceRate: "bg-purple-500/20 text-purple-400",
        Both: "bg-green-500/20 text-green-400",
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Worker Salary Profiles</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Define basic salary, overtime rate, and worker type</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ workerType: "Both" }); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    + Add / Update Profile
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">Salary Profile</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Worker</label>
                            <select {...register("workerId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select worker</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-400 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Basic Salary (Rs.)</label>
                            <input type="number" step="1" {...register("basicSalary")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">OT Rate / Hour (Rs.)</label>
                            <input type="number" step="0.5" {...register("overtimeRate")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Worker Type</label>
                            <select {...register("workerType")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="Both">Salary + Assembly</option>
                                <option value="Salary">Salary Only</option>
                                <option value="PieceRate">Assembly Only</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">{loading ? "Saving…" : "Save Profile"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="border-b border-white/10">
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">Worker</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">Basic Salary</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">OT Rate/Hr</th>
                        <th className="text-left px-4 py-3 text-slate-400 font-medium">Type</th>
                        <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                    </tr></thead>
                    <tbody>
                        {profiles.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No profiles set up yet.</td></tr>}
                        {profiles.map((p: any) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3">
                                <td className="px-4 py-3 font-medium">{p.worker?.name}</td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">Rs. {p.basicSalary.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-blue-400">Rs. {p.overtimeRate}/hr</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[p.workerType]}`}>{p.workerType}</span></td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
