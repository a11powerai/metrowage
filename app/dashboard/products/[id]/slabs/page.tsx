"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const schema = z.object({
    qtyFrom: z.union([z.string(), z.number()]).transform(Number),
    qtyTo: z.union([z.string(), z.number()]).transform(Number),
    ratePerUnit: z.union([z.string(), z.number()]).transform(Number),
}).refine((d) => d.qtyTo > d.qtyFrom, { message: "Qty To must be greater than Qty From", path: ["qtyTo"] });

type FormData = {
    qtyFrom: number;
    qtyTo: number;
    ratePerUnit: number;
};

export default function SlabsPage() {
    const params = useParams();
    const productId = params.id as string;
    const [product, setProduct] = useState<any>(null);
    const [slabs, setSlabs] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [overlapError, setOverlapError] = useState("");

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const load = async () => {
        const [pRes, sRes] = await Promise.all([
            fetch(`/api/products/${productId}/info`),
            fetch(`/api/products/${productId}/slabs`),
        ]);
        setProduct(await pRes.json());
        setSlabs(await sRes.json());
    };

    useEffect(() => { load(); }, [productId]);

    const onSubmit = async (data: FormData) => {
        setLoading(true); setOverlapError("");
        const res = await fetch(`/api/products/${productId}/slabs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            setOverlapError(err.error || "Error saving slab");
        } else {
            reset(); setShowForm(false); load();
        }
        setLoading(false);
    };

    const del = async (id: number) => {
        if (!confirm("Delete this slab?")) return;
        await fetch(`/api/slabs/${id}`, { method: "DELETE" }); load();
    };

    return (
        <div>
            <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Products
            </Link>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{product?.name} — Incentive Slabs</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Rate is applied to the full quantity (not progressive)</p>
                </div>
                <button onClick={() => { setShowForm(true); setOverlapError(""); reset(); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Add Slab
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">New Incentive Slab</h2>
                        <button onClick={() => { setShowForm(false); reset(); setOverlapError(""); }}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Quantity From</label>
                            <input type="number" {...register("qtyFrom")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.qtyFrom && <p className="text-red-400 text-xs mt-1">{errors.qtyFrom.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Quantity To</label>
                            <input type="number" {...register("qtyTo")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.qtyTo && <p className="text-red-400 text-xs mt-1">{errors.qtyTo.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Rate per Unit (LKR)</label>
                            <input type="number" step="0.01" {...register("ratePerUnit")} className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.ratePerUnit && <p className="text-red-400 text-xs mt-1">{errors.ratePerUnit.message}</p>}
                        </div>
                        {overlapError && (
                            <div className="md:col-span-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{overlapError}</div>
                        )}
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                                {loading ? "Saving…" : "Add Slab"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); reset(); setOverlapError(""); }} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Qty From</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Qty To</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Rate / Unit (Rs.)</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slabs.length === 0 && (<tr><td colSpan={4} className="text-center py-10 text-slate-500">No slabs defined yet.</td></tr>)}
                        {slabs.sort((a, b) => a.qtyFrom - b.qtyFrom).map((s) => (
                            <tr key={s.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 font-medium">{s.qtyFrom}</td>
                                <td className="px-4 py-3 font-medium">{s.qtyTo}</td>
                                <td className="px-4 py-3 text-green-400 font-semibold">Rs. {s.ratePerUnit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => del(s.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
