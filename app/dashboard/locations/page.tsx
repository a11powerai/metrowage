"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, MapPin, Users } from "lucide-react";

const schema = z.object({
    name: z.string().min(1, "Name required"),
    address: z.string().optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    radius: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function LocationsPage() {
    const [locations, setLocations] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { radius: "200" },
    });

    const load = async () => {
        const res = await fetch("/api/locations");
        setLocations(await res.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        if (editId) {
            await fetch(`/api/locations/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        } else {
            await fetch("/api/locations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        }
        reset({ radius: "200" }); setEditId(null); setShowForm(false); setLoading(false); load();
    };

    const startEdit = (l: any) => {
        setEditId(l.id);
        setValue("name", l.name);
        setValue("address", l.address ?? "");
        setValue("lat", l.lat ? String(l.lat) : "");
        setValue("lng", l.lng ? String(l.lng) : "");
        setValue("radius", l.radius ? String(l.radius) : "200");
        setShowForm(true);
    };

    const del = async (id: number) => {
        if (!confirm("Delete this location?")) return;
        await fetch(`/api/locations/${id}`, { method: "DELETE" });
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage factories and work sites</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditId(null); reset({ radius: "200" }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Location
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">{editId ? "Edit Location" : "New Location"}</h2>
                        <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Location Name *</label>
                            <input {...register("name")} placeholder="Main Factory" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Geo Radius (metres)</label>
                            <input {...register("radius")} placeholder="200" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>GPS Latitude</label>
                            <input {...register("lat")} placeholder="6.9271" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>GPS Longitude</label>
                            <input {...register("lng")} placeholder="79.8612" className={inputCls} />
                        </div>
                        <div className="md:col-span-1">
                            <label className={labelCls}>Address</label>
                            <input {...register("address")} placeholder="123 Factory Road, Colombo" className={inputCls} />
                        </div>
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                                {loading ? "Saving…" : editId ? "Update" : "Create"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {locations.length === 0 && (
                    <div className="col-span-3 text-center py-16 text-gray-400">No locations added yet.</div>
                )}
                {locations.map((l: any) => (
                    <div key={l.id} className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-purple-600" />
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => startEdit(l)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                                <button onClick={() => del(l.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                            </div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">{l.name}</h3>
                        <p className="text-gray-500 text-xs mb-3">{l.address || "No address set"}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />{l._count?.workers ?? 0} workers
                            </span>
                            {l.lat && <span>📍 {Number(l.lat).toFixed(4)}, {Number(l.lng).toFixed(4)}</span>}
                            {l.radius && <span>⭕ {l.radius}m radius</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
