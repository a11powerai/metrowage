"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const schema = z.object({
    qtyFrom: z.coerce.number().min(1),
    qtyTo: z.coerce.number().min(1),
    ratePerUnit: z.coerce.number().min(0.01),
}).refine((d) => d.qtyTo > d.qtyFrom, { message: "Qty To must be greater than Qty From", path: ["qtyTo"] });

type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function SlabsPage() {
    const params = useParams();
    const productId = params.id as string;
    const [product, setProduct] = useState<any>(null);
    const [slabs, setSlabs] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [overlapError, setOverlapError] = useState("");

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema) as any
    });

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
            <Link href="/dashboard/products" className="inline-flex items-center gap-1.5 text-purple-600 hover:text-purple-700 text-sm mb-6 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Products
            </Link>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{product?.name} — Incentive Slabs</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Rate is applied to the full quantity (not progressive)</p>
                </div>
                <button onClick={() => { setShowForm(true); setOverlapError(""); reset(); }} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Slab
                </button>
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">New Incentive Slab</h2>
                        <button onClick={() => { setShowForm(false); reset(); setOverlapError(""); }}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Quantity From</label>
                            <input type="number" {...register("qtyFrom")} className={inputCls} />
                            {errors.qtyFrom && <p className="text-red-500 text-xs mt-1">{errors.qtyFrom.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Quantity To</label>
                            <input type="number" {...register("qtyTo")} className={inputCls} />
                            {errors.qtyTo && <p className="text-red-500 text-xs mt-1">{errors.qtyTo.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Rate per Unit (LKR)</label>
                            <input type="number" step="0.01" {...register("ratePerUnit")} className={inputCls} />
                            {errors.ratePerUnit && <p className="text-red-500 text-xs mt-1">{errors.ratePerUnit.message}</p>}
                        </div>
                        {overlapError && (
                            <div className="md:col-span-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{overlapError}</div>
                        )}
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 transition-colors shadow-sm">
                                {loading ? "Saving…" : "Add Slab"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); reset(); setOverlapError(""); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Qty From</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Qty To</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Rate / Unit (Rs.)</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {slabs.length === 0 && (<tr><td colSpan={4} className="text-center py-10 text-gray-400">No slabs defined yet.</td></tr>)}
                        {slabs.sort((a, b) => a.qtyFrom - b.qtyFrom).map((s) => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-800">{s.qtyFrom}</td>
                                <td className="px-4 py-3 font-medium text-gray-800">{s.qtyTo}</td>
                                <td className="px-4 py-3 text-purple-600 font-semibold">Rs. {s.ratePerUnit}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => del(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors group"><Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

