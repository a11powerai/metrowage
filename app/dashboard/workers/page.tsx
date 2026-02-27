"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, CheckCircle, XCircle, MapPin } from "lucide-react";

const schema = z.object({
    name: z.string().min(2, "Name required"),
    phone: z.string().optional(),
    nic: z.string().optional(),
    address: z.string().optional(),
    designation: z.string().optional(),
    allowGeoCheckin: z.boolean().optional(),
    locationId: z.string().optional(),
    status: z.enum(["Active", "Inactive"]),
});
type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function WorkersPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { status: "Active", allowGeoCheckin: false },
    });

    const load = async () => {
        const [wRes, lRes] = await Promise.all([fetch("/api/workers"), fetch("/api/locations")]);
        setWorkers(await wRes.json());
        setLocations(await lRes.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        if (editId) {
            await fetch(`/api/workers/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        } else {
            await fetch("/api/workers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        }
        reset({ status: "Active", allowGeoCheckin: false });
        setEditId(null); setShowForm(false); setLoading(false); load();
    };

    const startEdit = (w: any) => {
        setEditId(w.id);
        setValue("name", w.name);
        setValue("phone", w.phone ?? "");
        setValue("nic", w.nic ?? "");
        setValue("address", w.address ?? "");
        setValue("designation", w.designation ?? "");
        setValue("allowGeoCheckin", w.allowGeoCheckin ?? false);
        setValue("locationId", w.locationId ? String(w.locationId) : "");
        setValue("status", w.status);
        setShowForm(true);
    };

    const del = async (id: number) => {
        if (!confirm("Delete this worker?")) return;
        await fetch(`/api/workers/${id}`, { method: "DELETE" });
        load();
    };

    const filtered = workers.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.workerId.toLowerCase().includes(search.toLowerCase()) ||
        (w.designation ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{workers.length} workers registered</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditId(null); reset({ status: "Active", allowGeoCheckin: false }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Worker
                </button>
            </div>

            {/* Search */}
            <div className="mb-4">
                <input
                    placeholder="Search by name, ID, or designation…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={inputCls}
                />
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">{editId ? "Edit Worker" : "New Worker"}</h2>
                        <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {!editId && (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-4 text-xs text-purple-700">
                            ℹ Worker ID will be auto-generated (e.g. MW-001)
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Full Name *</label>
                            <input {...register("name")} placeholder="Ali Hassan" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Phone</label>
                            <input {...register("phone")} placeholder="+94 77 1234567" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>NIC</label>
                            <input {...register("nic")} placeholder="199012345678" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Designation</label>
                            <input {...register("designation")} placeholder="Assembly Worker" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Location / Factory</label>
                            <select {...register("locationId")} className={inputCls}>
                                <option value="">— None —</option>
                                {locations.map((l: any) => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Status</label>
                            <select {...register("status")} className={inputCls}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div className="md:col-span-3">
                            <label className={labelCls}>Address</label>
                            <input {...register("address")} placeholder="123, Main Street, Colombo" className={inputCls} />
                        </div>
                        <div className="md:col-span-3 flex items-center gap-3">
                            <input type="checkbox" id="geoCheck" {...register("allowGeoCheckin")} className="w-4 h-4 accent-purple-600" />
                            <label htmlFor="geoCheck" className="text-sm text-gray-700 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-purple-500" />
                                Allow geo check-in from other locations (e.g. drivers, delivery staff)
                            </label>
                        </div>
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                                {loading ? "Saving…" : editId ? "Update" : "Create Worker"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50 bg-purple-25">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">ID</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Designation</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Phone</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Location</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No workers found.</td></tr>
                        )}
                        {filtered.map((w) => (
                            <tr key={w.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-mono text-purple-600 font-semibold text-xs">{w.workerId}</td>
                                <td className="px-4 py-3 font-medium text-gray-800">{w.name}
                                    {w.allowGeoCheckin && <MapPin className="w-3 h-3 text-purple-400 inline ml-1" />}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{w.designation ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{w.phone ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{w.location?.name ?? "—"}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${w.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {w.status === "Active" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {w.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(w)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors mr-1"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                                    <button onClick={() => del(w.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
