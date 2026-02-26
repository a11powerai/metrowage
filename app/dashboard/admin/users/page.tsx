"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, ShieldCheck, CheckCircle, XCircle } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "Name required"),
    email: z.string().email("Valid email required"),
    password: z.string().min(6, "Min 6 characters"),
    role: z.enum(["SuperAdmin", "Admin", "Supervisor"]),
});
type FormData = z.infer<typeof schema>;

const ROLE_COLORS: Record<string, string> = {
    SuperAdmin: "bg-purple-500/20 text-purple-400",
    Admin: "bg-blue-500/20 text-blue-400",
    Supervisor: "bg-slate-500/20 text-slate-400",
};

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { role: "Supervisor" },
    });

    const load = async () => {
        const res = await fetch("/api/admin/users");
        setUsers(await res.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true); setError("");
        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const j = await res.json();
            setError(j.error ?? "Error");
        } else {
            reset({ role: "Supervisor" }); setShowForm(false); load();
        }
        setLoading(false);
    };

    const toggleActive = async (id: number, active: boolean) => {
        await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
        load();
    };

    const del = async (id: number) => {
        if (!confirm("Delete this user?")) return;
        await fetch(`/api/admin/users/${id}`, { method: "DELETE" }); load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-purple-400" /> User Management</h1>
                    <p className="text-slate-400 text-sm mt-0.5">SuperAdmin only — manage all system users</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ role: "Supervisor" }); setError(""); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">New User</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                            <input {...register("name")} placeholder="John Doe" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Email</label>
                            <input {...register("email")} type="email" placeholder="user@example.com" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Password</label>
                            <input {...register("password")} type="password" placeholder="Min 6 characters" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Role</label>
                            <select {...register("role")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="Supervisor">Supervisor</option>
                                <option value="Admin">Admin</option>
                                <option value="SuperAdmin">SuperAdmin</option>
                            </select>
                        </div>
                        {error && <div className="md:col-span-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                        <div className="md:col-span-2 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">{loading ? "Creating…" : "Create User"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Email</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Role</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Status</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-slate-500">No users.</td></tr>}
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 font-medium">{u.name}</td>
                                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{u.role}</span></td>
                                <td className="px-4 py-3">
                                    <button onClick={() => toggleActive(u.id, u.active)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${u.active ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}`}>
                                        {u.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {u.active ? "Active" : "Inactive"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => del(u.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><X className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
