"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, CheckCircle, XCircle } from "lucide-react";

const schema = z.object({
    workerId: z.string().min(1, "Worker ID required"),
    name: z.string().min(2, "Name required"),
    status: z.enum(["Active", "Inactive"]),
});
type FormData = z.infer<typeof schema>;

export default function WorkersPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { status: "Active" },
    });

    const load = async () => {
        const res = await fetch("/api/workers");
        setWorkers(await res.json());
    };

    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        if (editId) {
            await fetch(`/api/workers/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        } else {
            await fetch("/api/workers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        }
        reset({ status: "Active" });
        setEditId(null);
        setShowForm(false);
        setLoading(false);
        load();
    };

    const startEdit = (w: any) => {
        setEditId(w.id);
        setValue("workerId", w.workerId);
        setValue("name", w.name);
        setValue("status", w.status);
        setShowForm(true);
    };

    const del = async (id: number) => {
        if (!confirm("Delete this worker?")) return;
        await fetch(`/api/workers/${id}`, { method: "DELETE" });
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Workers</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{workers.length} workers registered</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditId(null); reset({ status: "Active" }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Worker
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">{editId ? "Edit Worker" : "New Worker"}</h2>
                        <button onClick={() => { setShowForm(false); setEditId(null); reset({ status: "Active" }); }}>
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Worker ID</label>
                            <input {...register("workerId")} placeholder="W001" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.workerId && <p className="text-red-400 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                            <input {...register("name")} placeholder="Ali Hassan" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Status</label>
                            <select {...register("status")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                {loading ? "Saving…" : editId ? "Update" : "Create"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset({ status: "Active" }); }} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">ID</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workers.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-10 text-slate-500">No workers yet. Add one above.</td></tr>
                        )}
                        {workers.map((w) => (
                            <tr key={w.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 font-mono text-blue-400">{w.workerId}</td>
                                <td className="px-4 py-3 font-medium">{w.name}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${w.status === "Active" ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                                        {w.status === "Active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {w.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(w)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-1"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                    <button onClick={() => del(w.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
