"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, Layers } from "lucide-react";
import Link from "next/link";

const schema = z.object({
    productId: z.string().min(1, "Product ID required"),
    name: z.string().min(2, "Name required"),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

    const load = async () => {
        const res = await fetch("/api/products");
        setProducts(await res.json());
    };
    useEffect(() => { load(); }, []);

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        if (editId) {
            await fetch(`/api/products/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        } else {
            await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        }
        reset(); setEditId(null); setShowForm(false); setLoading(false); load();
    };

    const startEdit = (p: any) => { setEditId(p.id); setValue("productId", p.productId); setValue("name", p.name); setShowForm(true); };
    const del = async (id: number) => {
        if (!confirm("Delete this product and all its slabs?")) return;
        await fetch(`/api/products/${id}`, { method: "DELETE" }); load();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Products</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{products.length} products configured</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditId(null); reset(); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 border border-white/10 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold">{editId ? "Edit Product" : "New Product"}</h2>
                        <button onClick={() => { setShowForm(false); setEditId(null); reset(); }}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Product ID</label>
                            <input {...register("productId")} placeholder="P001" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.productId && <p className="text-red-400 text-xs mt-1">{errors.productId.message}</p>}
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 mb-1 block">Product Name</label>
                            <input {...register("name")} placeholder="Fan Head" className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500" />
                            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div className="md:col-span-2 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                                {loading ? "Saving…" : editId ? "Update" : "Create"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset(); }} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-slate-800/50 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">ID</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                            <th className="text-left px-4 py-3 text-slate-400 font-medium">Slabs</th>
                            <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length === 0 && (<tr><td colSpan={4} className="text-center py-10 text-slate-500">No products yet.</td></tr>)}
                        {products.map((p) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3 font-mono text-purple-400">{p.productId}</td>
                                <td className="px-4 py-3 font-medium">{p.name}</td>
                                <td className="px-4 py-3">
                                    <Link href={`/dashboard/products/${p.id}/slabs`} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs transition-colors">
                                        <Layers className="w-3 h-3" /> {p._count?.slabs ?? 0} slabs
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-1"><Pencil className="w-3.5 h-3.5 text-slate-400" /></button>
                                    <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
