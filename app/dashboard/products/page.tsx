"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, X, Layers, Package } from "lucide-react";
import Link from "next/link";

const schema = z.object({
    name: z.string().min(2, "Name required"),
    category: z.string().optional(),
    model: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100 text-gray-800 placeholder:text-gray-400";
const labelCls = "text-xs text-gray-500 mb-1 block font-medium";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

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

    const startEdit = (p: any) => {
        setEditId(p.id);
        setValue("name", p.name);
        setValue("category", p.category ?? "");
        setValue("model", p.model ?? "");
        setShowForm(true);
    };
    const del = async (id: number) => {
        if (!confirm("Delete this product and all its slabs?")) return;
        await fetch(`/api/products/${id}`, { method: "DELETE" }); load();
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.model ?? "").toLowerCase().includes(search.toLowerCase()) ||
        p.productId.toLowerCase().includes(search.toLowerCase())
    );

    // Group by category
    const categories = [...new Set(filtered.map(p => p.category || "Uncategorized"))];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{products.length} products configured</p>
                </div>
                <button onClick={() => { setShowForm(true); setEditId(null); reset(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add Product
                </button>
            </div>

            <div className="mb-4">
                <input placeholder="Search by name, category, or model…" value={search} onChange={e => setSearch(e.target.value)} className={inputCls} />
            </div>

            {showForm && (
                <div className="bg-white border border-purple-100 rounded-2xl p-6 mb-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-800">{editId ? "Edit Product" : "New Product"}</h2>
                        <button onClick={() => { setShowForm(false); setEditId(null); reset(); }}><X className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    {!editId && (
                        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg mb-4 text-xs text-purple-700">
                            ℹ Product ID will be auto-generated (e.g. PRD-001)
                        </div>
                    )}
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Category</label>
                            <input {...register("category")} placeholder="Stand Fan, Electric Kettle, LED Bulb…" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Product Name *</label>
                            <input {...register("name")} placeholder="Stand Fan" className={inputCls} />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Model</label>
                            <input {...register("model")} placeholder="SFM-1618" className={inputCls} />
                        </div>
                        <div className="md:col-span-3 flex gap-3">
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                                {loading ? "Saving…" : editId ? "Update" : "Create Product"}
                            </button>
                            <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset(); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {filtered.length === 0 && (
                <div className="bg-white border border-purple-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
                    {search ? "No products match your search." : "No products yet. Add one above."}
                </div>
            )}

            {categories.map(cat => {
                const catProducts = filtered.filter(p => (p.category || "Uncategorized") === cat);
                return (
                    <div key={cat} className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-purple-400" />
                            <h2 className="font-semibold text-gray-700 text-sm">{cat}</h2>
                            <span className="text-xs text-gray-400">({catProducts.length})</span>
                        </div>
                        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-purple-50">
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">ID</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Model</th>
                                        <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Incentive Slabs</th>
                                        <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catProducts.map(p => (
                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                            <td className="px-4 py-3 font-mono text-purple-600 font-semibold text-xs">{p.productId}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                                            <td className="px-4 py-3 text-gray-500">{p.model || "—"}</td>
                                            <td className="px-4 py-3">
                                                <Link href={`/dashboard/products/${p.id}/slabs`}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs transition-colors">
                                                    <Layers className="w-3 h-3" /> {p._count?.slabs ?? 0} slabs
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => startEdit(p)} className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors mr-1"><Pencil className="w-3.5 h-3.5 text-gray-400" /></button>
                                                <button onClick={() => del(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
