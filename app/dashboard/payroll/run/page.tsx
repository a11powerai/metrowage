"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Play, Lock, X, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useSession } from "next-auth/react";

const schema = z.object({
    name: z.string().min(1, "Period name required"),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    factoryId: z.string().optional(),
    locationId: z.string().optional(),
    workerIds: z.record(z.string(), z.boolean()).optional(),
});
type RunFormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function RunPayrollPage() {

    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role ?? "";
    const canDelete = userRole === "SuperAdmin" || userRole === "Admin";

    const [periods, setPeriods] = useState<any[]>([]);
    const [workers, setWorkers] = useState<any[]>([]);
    const [factories, setFactories] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [missingProfiles, setMissingProfiles] = useState<number>(0);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<RunFormData>({ 
        resolver: zodResolver(schema) as any, 
        defaultValues: { periodStart: today, periodEnd: today, factoryId: "", locationId: "", workerIds: {} } 
    });

    const watchFactoryId = watch("factoryId");
    const watchLocationId = watch("locationId");
    const watchWorkerIds = watch("workerIds") || {};

    const filteredLocations = watchFactoryId ? locations.filter(l => l.factoryId?.toString() === watchFactoryId) : locations;
    
    // Filter workers based on selected factory and location
    const filteredWorkers = workers.filter(w => {
        if (watchFactoryId && w.location?.factoryId?.toString() !== watchFactoryId) return false;
        if (watchLocationId && w.locationId?.toString() !== watchLocationId) return false;
        return true;
    });

    const isAllSelected = filteredWorkers.length > 0 && filteredWorkers.every(w => watchWorkerIds[w.id]);

    const toggleAll = () => {
        const newVal = !isAllSelected;
        const currentVals = { ...watchWorkerIds };
        filteredWorkers.forEach(w => {
            currentVals[w.id] = newVal;
        });
        setValue("workerIds", currentVals);
    };


    const load = async () => {
        const [pRes, wRes, lRes, prRes] = await Promise.all([
            fetch("/api/payroll/periods"),
            fetch("/api/workers"),
            fetch("/api/locations").catch(() => null),
            fetch("/api/payroll/profiles"),
        ]);
        setPeriods(await pRes.json());

        const wData = await wRes.json();
        setWorkers(wData);

        const profilesData = await prRes.json();
        const activeWorkers = Array.isArray(wData) ? wData.filter((w: any) => w.status === "Active") : [];
        const profiles = Array.isArray(profilesData) ? profilesData : [];
        setMissingProfiles(activeWorkers.filter((w: any) =>
            !profiles.find((p: any) => p.workerId === w.id && p.basicSalary > 0)
        ).length);

        if (lRes && lRes.ok) {
            const locs = await lRes.json();
            setLocations(locs);
            // Extract unique factories
            const facsMap = new Map();
            locs.forEach((l: any) => {
                if (l.factory) facsMap.set(l.factory.id, l.factory);
            });
            setFactories(Array.from(facsMap.values()));
        } else {
            // fallback: extract from workers
            const locMap = new Map();
            const facMap = new Map();
            wData.forEach((w: any) => {
                if (w.location) {
                    locMap.set(w.location.id, w.location);
                    if (w.location.factory) facMap.set(w.location.factory.id, w.location.factory);
                }
            });
            setLocations(Array.from(locMap.values()));
            setFactories(Array.from(facMap.values()));
        }
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: RunFormData) => {
        setLoading(true); setMsg(null);
        // Extract dynamically selected workerIds
        const selectedIds = Object.keys(data.workerIds || {})
            .filter(id => data.workerIds?.[id])
            .map(id => parseInt(id));

        const payload = {
            ...data,
            workerIds: selectedIds.length > 0 ? selectedIds : undefined
        };

        const res = await fetch("/api/payroll/periods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            setMsg({ type: "success", text: "Payroll generated successfully! View in Payslips." });
            reset({ periodStart: today, periodEnd: today }); setShowForm(false); load();
        } else {
            const j = await res.json();
            setMsg({ type: "error", text: j.error ?? "Error generating payroll" });
        }
        setLoading(false);
    };

    const finalize = async (id: number) => {
        if (!confirm("Finalize this payroll period? It will be locked.")) return;
        await fetch(`/api/payroll/periods/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "Finalized" }) });
        load();
    };

    const deletePeriod = async (id: number, name: string) => {
        if (!confirm(`Delete payroll period "${name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/payroll/periods/${id}`, { method: "DELETE" });
        if (res.ok) {
            setMsg({ type: "success", text: `Period "${name}" deleted.` });
            load();
        } else {
            const j = await res.json();
            setMsg({ type: "error", text: j.error ?? "Delete failed." });
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Run Payroll</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Generate payroll periods — auto-includes assembly earnings, allowances, commissions, and deductions</p>
                </div>
                <button onClick={() => { setShowForm(true); setMsg(null); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Play className="w-4 h-4" /> Generate Payroll
                </button>
            </div>

            {missingProfiles > 0 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                        <strong>{missingProfiles} active worker(s)</strong> have no basic salary configured — their payslips will show Rs. 0.{" "}
                        <Link href="/dashboard/payroll/profiles" className="underline font-medium">Set up salary profiles →</Link>
                    </span>
                </div>
            )}

            {msg && (
                <div className={`px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between font-medium ${msg.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
                    {msg.text}
                    <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}


            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Payroll Period</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-sm text-blue-700">
                        <strong>ℹ Assembly earnings</strong> will be automatically pulled from all <em>Finalized</em> production days within the selected period. Only approved commissions and pending deductions will be included.
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                            <label className={labelCls}>Period Name</label>
                            <input {...register("name")} placeholder="e.g. February 2026" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Period Start</label>
                            <input type="date" {...register("periodStart")} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Period End</label>
                            <input type="date" {...register("periodEnd")} className={inputCls} />
                        </div>
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-purple-50">
                            <div>
                                <label className={labelCls}>Filter by Factory</label>
                                <select {...register("factoryId")} className={inputCls} onChange={(e) => {
                                    setValue("factoryId", e.target.value);
                                    setValue("locationId", ""); // Reset location when factory changes
                                }}>
                                    <option value="">All Factories</option>
                                    {factories.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Filter by Location</label>
                                <select {...register("locationId")} className={inputCls}>
                                    <option value="">All Locations in {watchFactoryId ? "Factory" : "System"}</option>
                                    {filteredLocations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-3 pt-2">
                            <label className={labelCls}>Select Workers</label>
                            <div className="border border-purple-100 rounded-lg max-h-48 overflow-y-auto bg-gray-50/50 p-2">
                                <label className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer border-b border-gray-100 font-medium">
                                    <input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="w-4 h-4 text-purple-600 rounded" />
                                    Select All Filtered Workers ({filteredWorkers.length})
                                </label>
                                {filteredWorkers.length === 0 && <div className="text-gray-400 p-2 text-sm text-center">No workers found.</div>}
                                {filteredWorkers.map(w => (
                                    <label key={w.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer text-sm">
                                        <input type="checkbox" {...register(`workerIds.${w.id}` as any)} className="w-4 h-4 text-purple-600 rounded" />
                                        <span>{w.name} {w.location?.name ? <span className="text-gray-400 text-xs">— {w.location.name}</span> : ""}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-3 flex items-end justify-end mt-2">
                            <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 transition-colors shadow-sm">
                                {loading ? "Generating…" : `Generate for Selected (${Object.values(watchWorkerIds).filter(Boolean).length || filteredWorkers.length}) Workers`}
                            </button>
                        </div>
                    </form>
                </div>
            )}


            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Period</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Date Range</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Workers</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {periods.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No payroll periods generated yet.</td></tr>}
                        {periods.map((p: any) => (
                            <tr key={p.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                                <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.periodStart).toLocaleDateString()} → {new Date(p.periodEnd).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">{p._count?.records ?? 0}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "Finalized" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                        {p.status === "Finalized" ? <Lock className="w-3 h-3" /> : null}{p.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                    <Link href={`/dashboard/payroll/payslips?periodId=${p.id}`} className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">View Payslips</Link>
                                    {p.status !== "Finalized" && (
                                        <button onClick={() => finalize(p.id)} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm">Finalize</button>
                                    )}
                                    {canDelete && p.status !== "Finalized" && (
                                        <button
                                            onClick={() => deletePeriod(p.id, p.name)}
                                            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                                            title="Delete payroll period"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
