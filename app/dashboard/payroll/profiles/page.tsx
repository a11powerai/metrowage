"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";

const schema = z.object({
    workerId: z.coerce.number().min(1, "Select worker"),
    basicSalary: z.coerce.number().min(0),
    overtimeRate: z.coerce.number().min(0),
    workerType: z.enum(["Salary", "PieceRate", "Both"]),
});
type ProfileFormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function SalaryProfilesPage() {

    const [workers, setWorkers] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { workerType: "Both" },
    });


    const load = async () => {
        const [wRes, pRes] = await Promise.all([fetch("/api/workers"), fetch("/api/payroll/profiles")]);
        setWorkers(await wRes.json());
        setProfiles(await pRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: ProfileFormData) => {
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

    const TYPE_COLORS: Record<string, string> = {
        Salary: "bg-blue-100 text-blue-700",
        PieceRate: "bg-purple-100 text-purple-700",
        Both: "bg-emerald-100 text-emerald-700",
    };


    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Worker Salary Profiles</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Define basic salary, overtime rate, and worker type</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ workerType: "Both" }); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    + Add / Update Profile
                </button>
            </div>


            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Salary Profile</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className={labelCls}>Worker</label>
                            <select {...register("workerId")} className={inputCls}>
                                <option value="">Select worker</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-500 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Basic Salary (Rs.)</label>
                            <input type="number" step="1" {...register("basicSalary")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>OT Rate / Hour (Rs.)</label>
                            <input type="number" step="0.5" {...register("overtimeRate")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Worker Type</label>
                            <select {...register("workerType")} className={inputCls}>
                                <option value="Both">Salary + Assembly</option>
                                <option value="Salary">Salary Only</option>
                                <option value="PieceRate">Assembly Only</option>
                            </select>
                        </div>
                        <div className="lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors shadow-sm">{loading ? "Saving…" : "Save Profile"}</button>
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
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Basic Salary</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">OT Rate/Hr</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Type</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No profiles set up yet.</td></tr>}
                        {profiles.map((p: any) => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{p.worker?.name}</td>
                                <td className="px-4 py-3 text-right text-emerald-600 font-bold">Rs. {p.basicSalary.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-blue-600">Rs. {p.overtimeRate}/hr</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.workerType]}`}>{p.workerType}</span></td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
