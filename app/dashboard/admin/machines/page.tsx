"use client";
import { useState } from "react";
import { Cpu, Plus, X, Wifi, CheckCircle } from "lucide-react";

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

// Stored in localStorage for the demo — replace with DB table if needed
const LS_KEY = "mw_machines";

function getMachines() {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveMachines(m: any[]) {
    localStorage.setItem(LS_KEY, JSON.stringify(m));
}

export default function MachinesPage() {
    const [machines, setMachines] = useState<any[]>(() => getMachines());
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: "", ip: "", location: "", model: "" });

    const add = () => {
        if (!form.name) return;
        const updated = [...machines, { ...form, id: Date.now() }];
        saveMachines(updated);
        setMachines(updated);
        setForm({ name: "", ip: "", location: "", model: "" });
        setShowForm(false);
    };

    const remove = (id: number) => {
        const updated = machines.filter(m => m.id !== id);
        saveMachines(updated);
        setMachines(updated);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                        <Cpu className="w-6 h-6 text-purple-600" /> Fingerprint Machines
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Register biometric devices and connect them to MetroWage</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Add Machine
                </button>
            </div>

            {/* Integration Info */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-3">
                    <Wifi className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                        <div className="font-semibold text-blue-800 mb-1">How to connect a fingerprint device</div>
                        <p className="text-blue-700 text-sm mb-3">
                            MetroWage accepts attendance data pushed via a simple HTTP POST request. Configure your biometric device (ZKTeco, Hikvision, etc.) to call the following endpoint after each punch:
                        </p>
                        <div className="bg-white border border-blue-200 rounded-xl p-3 font-mono text-xs text-gray-800 mb-3 overflow-x-auto">
                            <div className="text-purple-700 font-bold">POST {typeof window !== "undefined" ? window.location.origin : ""}/api/attendance</div>
                            <div className="mt-2 text-gray-600">Content-Type: application/json</div>
                            <pre className="mt-2 text-gray-700">{`{
  "workerId": 42,          // MetroWage internal worker ID
  "date": "2026-03-07",    // YYYY-MM-DD
  "checkInTime": "2026-03-07T08:05:00Z",   // ISO 8601 (optional)
  "checkOutTime": "2026-03-07T17:10:00Z",  // ISO 8601 (optional)
  "status": "Present"
}`}</pre>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {["ZKTeco", "Hikvision", "eSSL", "Suprema", "Anviz"].map(b => (
                                <span key={b} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">{b}</span>
                            ))}
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">+ Any device supporting HTTP push</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Machine Form */}
            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Register New Machine</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Machine Name</label>
                            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Entrance Reader" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>IP Address</label>
                            <input value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} placeholder="192.168.1.100" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Location</label>
                            <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Factory Floor A" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Model</label>
                            <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="ZKTeco K40 Pro" className={inputCls} />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={add} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">Add Machine</button>
                        <button onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {/* Machines List */}
            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Machine</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Model</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">IP Address</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Location</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No machines registered yet.</td></tr>
                        )}
                        {machines.map(m => (
                            <tr key={m.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-purple-400" /> {m.name}
                                </td>
                                <td className="px-4 py-3 text-gray-500">{m.model || "—"}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.ip || "—"}</td>
                                <td className="px-4 py-3 text-gray-500">{m.location || "—"}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        <CheckCircle className="w-3 h-3" /> Registered
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => remove(m.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                        <X className="w-3.5 h-3.5 text-red-400" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
