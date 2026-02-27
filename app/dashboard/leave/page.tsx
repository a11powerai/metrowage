"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, CheckCircle, XCircle, Clock } from "lucide-react";

const schema = z.object({
    workerId: z.string().min(1, "Select a worker"),
    fromDate: z.string().min(1),
    toDate: z.string().min(1),
    leaveType: z.enum(["Annual", "Sick", "Casual", "Unpaid"]),
    reason: z.string().min(1, "Reason required"),
});
type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

const statusConfig: Record<string, { label: string; cls: string; icon: any }> = {
    Pending: { label: "Pending", cls: "bg-yellow-100 text-yellow-700", icon: Clock },
    Approved: { label: "Approved", cls: "bg-green-100 text-green-700", icon: CheckCircle },
    Rejected: { label: "Rejected", cls: "bg-red-100 text-red-500", icon: XCircle },
};

export default function LeavePage() {
    const [leaves, setLeaves] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { leaveType: "Annual" },
    });

    const load = async () => {
        const [lRes, wRes] = await Promise.all([fetch("/api/leave"), fetch("/api/workers")]);
        setLeaves(await lRes.json());
        setWorkers((await wRes.json()).filter((w: any) => w.status === "Active"));
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        await fetch("/api/leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        reset({ leaveType: "Annual" }); setShowForm(false); setLoading(false); load();
    };

    const updateStatus = async (id: number, status: string) => {
        await fetch(`/api/leave/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
        load();
    };

    const del = async (id: number) => {
        if (!confirm("Remove this leave request?")) return;
        await fetch(`/api/leave/${id}`, { method: "DELETE" });
        load();
    };

    const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter);

    const dateDiff = (from: string, to: string) => {
        const d = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
        return `${d} day${d !== 1 ? "s" : ""}`;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Submit and approve leave requests</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); reset({ leaveType: "Annual" }); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> New Leave Request
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
                {["all", "Pending", "Approved", "Rejected"].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${filter === f ? "bg-purple-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:border-purple-300"}`}>
                        {f}
                    </button>
                ))}
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Leave Request</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Worker *</label>
                            <select {...register("workerId")} className={inputCls}>
                                <option value="">— Select Worker —</option>
                                {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-500 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Leave Type</label>
                            <select {...register("leaveType")} className={inputCls}>
                                <option>Annual</option>
                                <option>Sick</option>
                                <option>Casual</option>
                                <option>Unpaid</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>From Date *</label>
                            <input type="date" {...register("fromDate")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>To Date *</label>
                            <input type="date" {...register("toDate")} className={inputCls} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelCls}>Reason *</label>
                            <input {...register("reason")} placeholder="Reason for leave…" className={inputCls} />
                            {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
                                {loading ? "Submitting…" : "Submit Request"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Type</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Period</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Duration</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Reason</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No leave requests found.</td></tr>
                        )}
                        {filtered.map((l: any) => {
                            const sc = statusConfig[l.status] ?? statusConfig.Pending;
                            const Icon = sc.icon;
                            return (
                                <tr key={l.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800">{l.worker?.name}</div>
                                        <div className="text-xs text-purple-500 font-mono">{l.worker?.workerId}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">{l.leaveType}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-600">
                                        {new Date(l.fromDate).toLocaleDateString()} → {new Date(l.toDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{dateDiff(l.fromDate, l.toDate)}</td>
                                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">{l.reason}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>
                                            <Icon className="w-3 h-3" />{sc.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {l.status === "Pending" && (
                                                <>
                                                    <button onClick={() => updateStatus(l.id, "Approved")} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs transition-colors">Approve</button>
                                                    <button onClick={() => updateStatus(l.id, "Rejected")} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs transition-colors">Reject</button>
                                                </>
                                            )}
                                            <button onClick={() => del(l.id)} className="px-2 py-1 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-400 rounded-lg text-xs transition-colors">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
