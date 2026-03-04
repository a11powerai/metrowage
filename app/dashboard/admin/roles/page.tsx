"use client";
import { useEffect, useState } from "react";
import { KeyRound, Plus, X, Save, Shield, Trash2, Users } from "lucide-react";

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

interface RoleData {
    id: number;
    name: string;
    description: string | null;
    isSystem: boolean;
    userCount: number;
    permissions: string[];
}

interface PermGrouped {
    [module: string]: { key: string; label: string }[];
}

export default function RolesPage() {
    const [roles, setRoles] = useState<RoleData[]>([]);
    const [grouped, setGrouped] = useState<PermGrouped>({});
    const [editing, setEditing] = useState<RoleData | null>(null);
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newPerms, setNewPerms] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadRoles = async () => {
        const res = await fetch("/api/admin/roles");
        setRoles(await res.json());
    };
    const loadPerms = async () => {
        const res = await fetch("/api/admin/permissions");
        const data = await res.json();
        setGrouped(data.grouped);
    };

    useEffect(() => { loadRoles(); loadPerms(); }, []);

    const createRole = async () => {
        if (!newName.trim()) return;
        setSaving(true); setError("");
        const res = await fetch("/api/admin/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName, description: newDesc, permissions: newPerms }),
        });
        if (!res.ok) { setError((await res.json()).error); }
        else { setShowNew(false); setNewName(""); setNewDesc(""); setNewPerms([]); loadRoles(); }
        setSaving(false);
    };

    const saveRole = async () => {
        if (!editing) return;
        setSaving(true); setError("");
        const res = await fetch(`/api/admin/roles/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: editing.name, description: editing.description, permissions: editing.permissions }),
        });
        if (!res.ok) { setError((await res.json()).error); }
        else { setEditing(null); loadRoles(); }
        setSaving(false);
    };

    const deleteRole = async (id: number) => {
        if (!confirm("Delete this role?")) return;
        const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
        if (!res.ok) { alert((await res.json()).error); }
        else { loadRoles(); }
    };

    const togglePerm = (perms: string[], key: string) => {
        return perms.includes(key) ? perms.filter((k) => k !== key) : [...perms, key];
    };

    const toggleAllModule = (perms: string[], modulePerms: { key: string }[]) => {
        const keys = modulePerms.map((p) => p.key);
        const allOn = keys.every((k) => perms.includes(k));
        if (allOn) return perms.filter((k) => !keys.includes(k));
        return [...new Set([...perms, ...keys])];
    };

    const PermGrid = ({ perms, setPerms }: { perms: string[]; setPerms: (p: string[]) => void }) => (
        <div className="space-y-4">
            {Object.entries(grouped).map(([module, modulePerms]) => {
                const allOn = modulePerms.every((p) => perms.includes(p.key));
                const someOn = modulePerms.some((p) => perms.includes(p.key));
                return (
                    <div key={module} className="border border-purple-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setPerms(toggleAllModule(perms, modulePerms))}
                                className={`w-4 h-4 rounded border-2 transition-colors ${allOn ? "bg-purple-600 border-purple-600" : someOn ? "bg-purple-200 border-purple-400" : "border-gray-300"}`}
                            />
                            <span className="font-medium text-sm text-gray-700">{module}</span>
                            <span className="text-xs text-gray-400 ml-auto">{modulePerms.filter((p) => perms.includes(p.key)).length}/{modulePerms.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {modulePerms.map((p) => (
                                <label key={p.key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={perms.includes(p.key)}
                                        onChange={() => setPerms(togglePerm(perms, p.key))}
                                        className="accent-purple-600 w-3.5 h-3.5"
                                    />
                                    <span className="text-sm text-gray-600">{p.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                        <KeyRound className="w-6 h-6 text-purple-600" /> Roles & Permissions
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">Manage user roles and their feature access</p>
                </div>
                <button
                    onClick={() => { setShowNew(true); setEditing(null); setNewName(""); setNewDesc(""); setNewPerms([]); setError(""); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> New Role
                </button>
            </div>

            {/* New Role Form */}
            {showNew && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Create New Role</h2>
                        <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={labelCls}>Role Name</label>
                            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Payroll Officer" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Description</label>
                            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description" className={inputCls} />
                        </div>
                    </div>
                    <label className={labelCls}>Permissions</label>
                    <PermGrid perms={newPerms} setPerms={setNewPerms} />
                    {error && <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}
                    <div className="flex gap-3 mt-4">
                        <button onClick={createRole} disabled={saving} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                            {saving ? "Creating…" : "Create Role"}
                        </button>
                        <button onClick={() => setShowNew(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {/* Editing Role */}
            {editing && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">Edit Role: {editing.name}</h2>
                        <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className={labelCls}>Role Name</label>
                            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Description</label>
                            <input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={inputCls} />
                        </div>
                    </div>
                    <label className={labelCls}>Permissions</label>
                    <PermGrid perms={editing.permissions} setPerms={(p) => setEditing({ ...editing, permissions: p })} />
                    {error && <div className="mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}
                    <div className="flex gap-3 mt-4">
                        <button onClick={saveRole} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60 shadow-sm">
                            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
                        </button>
                        <button onClick={() => setEditing(null)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {/* Roles Table */}
            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-100">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Role</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Description</th>
                            <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Permissions</th>
                            <th className="text-center px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Users</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No roles.</td></tr>}
                        {roles.map((r) => (
                            <tr key={r.id} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-purple-500" />
                                        {r.name}
                                        {r.isSystem && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-normal">System</span>}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-500">{r.description ?? "—"}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{r.permissions.length}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center gap-1 text-gray-500">
                                        <Users className="w-3 h-3" /> {r.userCount}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => { setEditing(r); setShowNew(false); setError(""); }}
                                            className="px-3 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg text-xs font-medium transition-colors"
                                        >Edit</button>
                                        {!r.isSystem && (
                                            <button
                                                onClick={() => deleteRole(r.id)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                            </button>
                                        )}
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
