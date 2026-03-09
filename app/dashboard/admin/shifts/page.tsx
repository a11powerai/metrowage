"use client";
import { useEffect, useState } from "react";
import { Clock, Plus, X, Save, Trash2, Star } from "lucide-react";

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

interface ShiftData {
    id: number;
    name: string;
    startTime: string;
    endTime: string;
    breakMinutes: number;
    standardHours: number;
    isDefault: boolean;
    locationId: number | null;
    location: { id: number; name: string } | null;
}

interface LocationOption {
    id: number;
    name: string;
}

export default function ShiftsPage() {
    const [shifts, setShifts] = useState<ShiftData[]>([]);
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<ShiftData | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "Default Shift",
        startTime: "08:00",
        endTime: "17:30",
        breakMinutes: 60,
        standardHours: 8,
        locationId: "",
        isDefault: false,
    });

    const load = async () => {
        const [sRes, lRes] = await Promise.all([
            fetch("/api/admin/shifts"),
            fetch("/api/locations"),
        ]);
        setShifts(await sRes.json());
        setLocations(await lRes.json());
    };

    useEffect(() => { load(); }, []);

    const resetForm = () => {
        setForm({ name: "Default Shift", startTime: "08:00", endTime: "17:30", breakMinutes: 60, standardHours: 8, locationId: "", isDefault: false });
        setEditing(null);
        setShowForm(false);
    };

    const openEdit = (s: ShiftData) => {
        setForm({
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            breakMinutes: s.breakMinutes,
            standardHours: s.standardHours,
            locationId: s.locationId ? String(s.locationId) : "",
            isDefault: s.isDefault,
        });
        setEditing(s);
        setShowForm(true);
    };

    const save = async () => {
        setSaving(true);
        const payload = {
            ...form,
            breakMinutes: Number(form.breakMinutes),
            standardHours: Number(form.standardHours),
            locationId: form.locationId ? Number(form.locationId) : null,
        };

        if (editing) {
            await fetch(`/api/admin/shifts/${editing.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        } else {
            await fetch("/api/admin/shifts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }
        setSaving(false);
        resetForm();
        load();
    };

    const remove = async (id: number) => {
        if (!confirm("Delete this shift config?")) return;
        await fetch(`/api/admin/shifts/${id}`, { method: "DELETE" });
        load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Shift Configuration</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage standard working hours and overtime thresholds</p>
                </div>
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> New Shift
                </button>
            </div>

            {/* Form modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-gray-800">{editing ? "Edit Shift" : "New Shift"}</h2>
                            <button onClick={resetForm}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className={labelCls}>Shift Name</label>
                                <input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Shift" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Start Time</label>
                                    <input type="time" className={inputCls} value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelCls}>End Time</label>
                                    <input type="time" className={inputCls} value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Break (minutes)</label>
                                    <input type="number" className={inputCls} value={form.breakMinutes} onChange={e => setForm({ ...form, breakMinutes: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className={labelCls}>Standard Hours</label>
                                    <input type="number" step="0.5" className={inputCls} value={form.standardHours} onChange={e => setForm({ ...form, standardHours: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Location (optional)</label>
                                <select className={inputCls} value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                                    <option value="">All Locations</option>
                                    {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                                    className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500" />
                                <span className="text-sm text-gray-700">Set as default shift</span>
                            </label>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={save} disabled={saving || !form.name.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                                <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
                            </button>
                            <button onClick={resetForm}
                                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shifts table */}
            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Hours</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Break</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Std Hours</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Location</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shifts.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No shift configs yet.</td></tr>
                        )}
                        {shifts.map(s => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-purple-400" />
                                        <span className="font-medium text-gray-800">{s.name}</span>
                                        {s.isDefault && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                                <Star className="w-3 h-3" /> Default
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.startTime} — {s.endTime}</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{s.breakMinutes} min</td>
                                <td className="px-4 py-3 text-gray-600 text-xs">{s.standardHours}h</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{s.location?.name ?? "All"}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => openEdit(s)}
                                            className="px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-50 text-purple-600 rounded-xl text-xs font-medium transition-colors">
                                            Edit
                                        </button>
                                        <button onClick={() => remove(s.id)}
                                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
