"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Lock, CheckCircle, Unlock, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const schema = z.object({
    date: z.string().min(1, "Date required"),
    workerId: z.coerce.number().min(1, "Worker required"),
    productId: z.coerce.number().min(1, "Product required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});
type FormData = z.infer<typeof schema>;

export default function ProductionPage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [lines, setLines] = useState<any[]>([]);
    const [dayStatus, setDayStatus] = useState<string | null>(null);
    const [dayId, setDayId] = useState<number | null>(null);
    const [preview, setPreview] = useState<{ rate: number; total: number } | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);

    const today = new Date().toISOString().split("T")[0];

    const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema) as any,
        defaultValues: { date: today },
    });

    const watchDate = watch("date");
    const watchWorker = watch("workerId");
    const watchProduct = watch("productId");
    const watchQty = watch("quantity");

    const loadLines = async (date: string) => {
        const res = await fetch(`/api/production?date=${date}`);
        const data = await res.json();
        setLines(data.lines ?? []);
        setDayStatus(data.status ?? null);
        setDayId(data.id ?? null);
    };

    useEffect(() => {
        fetch("/api/workers").then(r => r.json()).then(setWorkers);
        fetch("/api/products").then(r => r.json()).then(setProducts);
    }, []);

    useEffect(() => { if (watchDate) loadLines(watchDate); }, [watchDate]);

    // Live preview
    useEffect(() => {
        if (!watchProduct || !watchQty || watchQty < 1) { setPreview(null); return; }
        fetch(`/api/production/preview?productId=${watchProduct}&quantity=${watchQty}`)
            .then(r => r.json())
            .then(d => setPreview(d.rate ? d : null))
            .catch(() => setPreview(null));
    }, [watchProduct, watchQty]);

    const onSubmit = async (data: FormData) => {
        setLoading(true); setMsg(null);
        const res = await fetch("/api/production", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
            setMsg({ type: "error", text: json.error ?? "Error saving entry" });
        } else {
            setMsg({ type: "success", text: "Entry saved successfully!" });
            reset({ date: data.date });
            setShowForm(false);
            loadLines(data.date);
        }
        setLoading(false);
    };

    const finalize = async () => {
        if (!confirm("Finalize this day? It will be locked from further edits.")) return;
        await fetch("/api/production/finalize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: watchDate }) });
        loadLines(watchDate);
    };

    const unlock = async () => {
        if (!confirm("Unlock this day for editing? (Admin override)")) return;
        await fetch("/api/production/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date: watchDate }) });
        loadLines(watchDate);
    };

    const deleteEntry = async (id: number) => {
        if (!confirm("Remove this entry?")) return;
        await fetch(`/api/production/${id}`, { method: "DELETE" });
        loadLines(watchDate);
    };

    const workerTotals = lines.reduce((acc: Record<string, any>, l: any) => {
        const key = l.worker.name;
        if (!acc[key]) acc[key] = { name: key, total: 0 };
        acc[key].total += l.lineTotal;
        return acc;
    }, {});
    const factoryTotal = lines.reduce((a, l) => a + l.lineTotal, 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Daily Production Entry</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Select a date to view or add entries</p>
                </div>
                <div className="flex items-center gap-2">
                    {dayStatus === "Open" && lines.length > 0 && (
                        <button onClick={finalize} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors">
                            <CheckCircle className="w-4 h-4" /> Finalize Day
                        </button>
                    )}
                    {dayStatus === "Finalized" && (
                        <button onClick={unlock} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors">
                            <Unlock className="w-4 h-4" /> Unlock Day
                        </button>
                    )}
                    {dayStatus !== "Finalized" && (
                        <button onClick={() => { setShowForm(true); setMsg(null); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                            <Plus className="w-4 h-4" /> Add Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-4 mb-6">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">Date</label>
                    <input type="date" {...register("date")} className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                </div>
                {dayStatus && (
                    <div className="mt-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${dayStatus === "Finalized" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"}`}>
                            {dayStatus === "Finalized" ? <Lock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {dayStatus}
                        </span>
                    </div>
                )}
            </div>

            {/* Add Entry Form */}
            {showForm && dayStatus !== "Finalized" && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">New Production Entry</h2>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Date</label>
                            <input type="date" {...register("date")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Worker</label>
                            <select {...register("workerId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select worker</option>
                                {workers.filter(w => w.status === "Active").map(w => <option key={w.id} value={w.id}>{w.name} ({w.workerId})</option>)}
                            </select>
                            {errors.workerId && <p className="text-red-400 text-xs mt-1">{errors.workerId.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Product</label>
                            <select {...register("productId")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                                <option value="">Select product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.productId})</option>)}
                            </select>
                            {errors.productId && <p className="text-red-400 text-xs mt-1">{errors.productId.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Quantity</label>
                            <input type="number" min={1} {...register("quantity")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.quantity && <p className="text-red-400 text-xs mt-1">{errors.quantity.message}</p>}
                        </div>

                        {preview && (
                            <div className="lg:col-span-4 flex gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm">
                                <div>Matched Rate: <span className="text-blue-300 font-semibold">Rs. {preview.rate}</span> / unit</div>
                                <div>Estimated Total: <span className="text-green-300 font-semibold">Rs. {preview.total}</span></div>
                            </div>
                        )}
                        {!preview && watchProduct && watchQty > 0 && (
                            <div className="lg:col-span-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
                                ⚠ No matching slab found for this quantity. Please set up slabs for this product.
                            </div>
                        )}

                        {msg && (
                            <div className={`lg:col-span-4 px-4 py-3 rounded-lg text-sm ${msg.type === "error" ? "bg-red-500/10 border border-red-500/30 text-red-400" : "bg-green-500/10 border border-green-500/30 text-green-400"}`}>
                                {msg.text}
                            </div>
                        )}

                        <div className="lg:col-span-4 flex gap-3">
                            <button type="submit" disabled={loading || !preview} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                                {loading ? "Saving…" : "Save Entry"}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Entries Table */}
            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden mb-6">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="font-semibold text-sm">{lines.length} Production Entries — {watchDate ? formatDate(watchDate) : ""}</h2>
                    {factoryTotal > 0 && <span className="text-green-400 font-semibold text-sm">Factory Total: {formatCurrency(factoryTotal)}</span>}
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Worker</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Product</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Qty</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Rate</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Line Total</th>
                            {dayStatus !== "Finalized" && <th className="text-right px-4 py-3 text-slate-400 font-medium">Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {lines.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-slate-500">No entries for this date.</td></tr>)}
                        {lines.map((l: any) => (
                            <tr key={l.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 font-medium">{l.worker.name}</td>
                                <td className="px-4 py-3 text-slate-300">{l.product.name}</td>
                                <td className="px-4 py-3 text-right">{l.quantity}</td>
                                <td className="px-4 py-3 text-right text-blue-400">Rs. {l.appliedRate}</td>
                                <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatCurrency(l.lineTotal)}</td>
                                {dayStatus !== "Finalized" && (
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => deleteEntry(l.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><X className="w-3.5 h-3.5 text-red-400" /></button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Worker Totals Summary */}
            {Object.keys(workerTotals).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(workerTotals).map((w: any) => (
                        <div key={w.name} className="bg-slate-800/50 border border-white/10 rounded-xl p-4">
                            <div className="text-slate-400 text-xs mb-1">Worker Total</div>
                            <div className="font-semibold">{w.name}</div>
                            <div className="text-green-400 text-xl font-bold mt-1">{formatCurrency(w.total)}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
