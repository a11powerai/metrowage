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
    SuperAdmin: "bg-purple-100 text-purple-700",
    Admin: "bg-blue-100 text-blue-700",
    Supervisor: "bg-gray-100 text-gray-700",
};

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";


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
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900"><ShieldCheck className="w-6 h-6 text-purple-600" /> User Management</h1>
                    <p className="text-gray-500 text-sm mt-0.5">SuperAdmin only — manage all system users</p>
                </div>
                <button onClick={() => { setShowForm(true); reset({ role: "Supervisor" }); setError(""); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add User
                </button>
            </div>


            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New User</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Full Name</label>
                            <input {...register("name")} placeholder="John Doe" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Email</label>
                            <input {...register("email")} type="email" placeholder="user@example.com" className={inputCls} />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Password</label>
                            <input {...register("password")} type="password" placeholder="Min 6 characters" className={inputCls} />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Role</label>
                            <select {...register("role")} className={inputCls}>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Admin">Admin</option>
                                <option value="SuperAdmin">SuperAdmin</option>
                            </select>
                        </div>
                        {error && <div className="md:col-span-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}
                        <div className="md:col-span-2 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">{loading ? "Creating…" : "Create User"}</button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}


            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-100">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Email</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Role</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No users.</td></tr>}
                        {users.map((u) => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{u.role}</span></td>
                                <td className="px-4 py-3">
                                    <button onClick={() => toggleActive(u.id, u.active)} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {u.active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {u.active ? "Active" : "Inactive"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => del(u.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><X className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
