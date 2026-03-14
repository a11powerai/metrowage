"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
    Eye, Play, Lock, X, Trash2, CheckCircle, ChevronDown, ChevronUp,
    Download, AlertTriangle, Users, MapPin, User
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerPreview {
    worker: { id: number; workerId: string; name: string; locationId: number | null; location: { name: string } | null };
    profile: { basicSalary: number; salaryFrequency: string; overtimeRate: number; workerType: string; dutyStart: string; dutyEnd: string } | null;
    presentDays: number;
    totalHoursWorked: number;
    otHours: number;
    allowances: { name: string; amount: number; frequency: string }[];
    allowancesTotal: number;
    deductions: { type: string; description: string; amount: number }[];
    deductionsTotal: number;
    assemblyEarnings: number;
    estimatedBasic: number;
    estimatedOt: number;
    estimatedGross: number;
    estimatedNet: number;
}

interface GeneratedRecord {
    id: number;
    worker: { id: number; name: string; locationId: number | null; location: { name: string } | null };
    basicSalary: number;
    overtimeHours: number;
    overtimePay: number;
    allowancesTotal: number;
    commissionsTotal: number;
    assemblyEarnings: number;
    deductionsTotal: number;
    grossPay: number;
    netPay: number;
    presentDays: number;
    totalHoursWorked: number;
    allowanceLines: { id: number; name: string; amount: number }[];
    deductionLines: { id: number; type: string; description: string; amount: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = "px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 text-gray-800 w-full";
const today = new Date().toISOString().split("T")[0];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PayrollGeneratorPage() {
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role ?? "";
    const canAdminDelete = userRole === "SuperAdmin" || userRole === "Admin";

    // Config state
    const [periodName, setPeriodName] = useState("");
    const [dateStart, setDateStart] = useState(today);
    const [dateEnd, setDateEnd] = useState(today);
    const [locationId, setLocationId] = useState("");
    const [locations, setLocations] = useState<any[]>([]);

    // Preview state
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState<WorkerPreview[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    // Generated period state
    const [generating, setGenerating] = useState(false);
    const [period, setPeriod] = useState<any>(null);
    const [generatedRecords, setGeneratedRecords] = useState<GeneratedRecord[]>([]);
    const [existingPeriods, setExistingPeriods] = useState<any[]>([]);
    const [loadPeriodId, setLoadPeriodId] = useState("");

    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // ── Load initial data ──
    useEffect(() => {
        fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : []));
        fetch("/api/payroll/periods").then(r => r.json()).then(d => setExistingPeriods(Array.isArray(d) ? d : []));
    }, []);

    // ── Preview ──
    const handlePreview = async () => {
        if (!dateStart || !dateEnd) return;
        setPreviewing(true);
        setPreviewData([]);
        setSelectedIds(new Set());
        setPeriod(null);
        setGeneratedRecords([]);
        setMsg(null);

        const params = new URLSearchParams({ start: dateStart, end: dateEnd });
        if (locationId) params.set("locationId", locationId);

        const res = await fetch(`/api/payroll/preview?${params}`);
        const data = await res.json();
        setPreviewData(Array.isArray(data) ? data : []);
        setPreviewing(false);

        // Auto-select all
        setSelectedIds(new Set((Array.isArray(data) ? data : []).map((w: WorkerPreview) => w.worker.id)));
    };

    // ── Load existing period ──
    const handleLoadPeriod = async (id: string) => {
        if (!id) return;
        setMsg(null);
        const res = await fetch(`/api/payroll/periods/${id}`);
        const data = await res.json();
        if (!data) return;
        setPeriod(data);
        setGeneratedRecords(data.records ?? []);
        setPreviewData([]);
        // Populate dates from period
        setDateStart(data.periodStart?.split("T")[0] ?? today);
        setDateEnd(data.periodEnd?.split("T")[0] ?? today);
        setPeriodName(data.name ?? "");
        setLoadPeriodId(id);
    };

    // ── Generate ──
    const handleGenerate = async (scope: "all" | "location" | "selected") => {
        if (!periodName.trim()) { setMsg({ type: "error", text: "Please enter a period name." }); return; }
        if (!dateStart || !dateEnd) { setMsg({ type: "error", text: "Please set date range." }); return; }
        if (scope === "selected" && selectedIds.size === 0) { setMsg({ type: "error", text: "Select at least one worker." }); return; }

        setGenerating(true); setMsg(null);

        const body: any = { name: periodName, periodStart: dateStart, periodEnd: dateEnd };
        if ((scope === "location" || scope === "all") && locationId) body.locationId = locationId;
        if (scope === "selected") body.workerIds = Array.from(selectedIds);

        const res = await fetch("/api/payroll/periods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            const { id } = await res.json();
            // Load the generated period
            const pRes = await fetch(`/api/payroll/periods/${id}`);
            const pData = await pRes.json();
            setPeriod(pData);
            setGeneratedRecords(pData.records ?? []);
            setPreviewData([]);

            // Refresh periods list
            fetch("/api/payroll/periods").then(r => r.json()).then(d => setExistingPeriods(Array.isArray(d) ? d : []));
            setMsg({ type: "success", text: `Payroll generated for "${periodName}". Review below and finalize when ready.` });
        } else {
            const j = await res.json();
            setMsg({ type: "error", text: j.error ?? "Generation failed." });
        }
        setGenerating(false);
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!period || !confirm(`Delete payroll "${period.name}"? This cannot be undone.`)) return;
        const res = await fetch(`/api/payroll/periods/${period.id}`, { method: "DELETE" });
        if (res.ok) {
            setPeriod(null); setGeneratedRecords([]);
            fetch("/api/payroll/periods").then(r => r.json()).then(d => setExistingPeriods(Array.isArray(d) ? d : []));
            setMsg({ type: "success", text: "Period deleted. Adjust salary profiles and generate again." });
        } else {
            const j = await res.json();
            setMsg({ type: "error", text: j.error ?? "Delete failed." });
        }
    };

    // ── Finalize ──
    const handleFinalize = async () => {
        if (!period || !confirm("Finalize this payroll? It will be locked and cannot be changed.")) return;
        await fetch(`/api/payroll/periods/${period.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Finalized" }),
        });
        const pRes = await fetch(`/api/payroll/periods/${period.id}`);
        const pData = await pRes.json();
        setPeriod(pData);
        fetch("/api/payroll/periods").then(r => r.json()).then(d => setExistingPeriods(Array.isArray(d) ? d : []));
        setMsg({ type: "success", text: `Payroll "${period.name}" has been finalized.` });
    };

    // ── Excel export ──
    const exportExcel = async () => {
        const XLSX = await import("xlsx");
        const rows = generatedRecords.map((r: GeneratedRecord) => ({
            Worker: r.worker.name,
            Location: r.worker.location?.name ?? "",
            "Days Present": r.presentDays,
            "Hours Worked": r.totalHoursWorked,
            "Basic Salary": r.basicSalary,
            "OT Pay": r.overtimePay,
            "Allowances": r.allowancesTotal,
            "Assembly Earnings": r.assemblyEarnings,
            "Gross Pay": r.grossPay,
            "Deductions": r.deductionsTotal,
            "Net Pay": r.netPay,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Payroll");
        XLSX.writeFile(wb, `payroll-${period?.name ?? "draft"}.xlsx`);
    };

    // ─── Derived ────────────────────────────────────────────────────────────────
    const previewTotal = previewData.reduce((s, w) => s + w.estimatedNet, 0);
    const generatedTotal = generatedRecords.reduce((s, r) => s + r.netPay, 0);
    const isFinalized = period?.status === "Finalized";

    // Filter generated records by location if filter is set
    const visibleGenerated = generatedRecords.filter(r =>
        !locationId || String(r.worker.locationId) === locationId
    );

    // ─── Render ──────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Generate Payroll</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        Review basic salary, allowances, deductions and production together — then generate and finalize
                    </p>
                </div>
                {period && (
                    <div className="flex items-center gap-2">
                        {!isFinalized && canAdminDelete && (
                            <button onClick={handleDelete}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-medium shadow-sm">
                                <Trash2 className="w-3.5 h-3.5" /> Delete & Redo
                            </button>
                        )}
                        {!isFinalized && (
                            <button onClick={handleFinalize}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm">
                                <CheckCircle className="w-4 h-4" /> Finalize Payroll
                            </button>
                        )}
                        <button onClick={exportExcel}
                            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium shadow-sm">
                            <Download className="w-3.5 h-3.5" /> Excel
                        </button>
                    </div>
                )}
            </div>

            {/* ── Message ── */}
            {msg && (
                <div className={`px-4 py-3 rounded-lg mb-5 text-sm flex items-center justify-between font-medium ${msg.type === "success" ? "bg-emerald-50 border border-emerald-100 text-emerald-700" : "bg-red-50 border border-red-100 text-red-700"}`}>
                    {msg.text}
                    <button onClick={() => setMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* ── Config Panel ── */}
            <div className="bg-white border border-purple-100 rounded-2xl p-5 mb-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="lg:col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Period Name</label>
                        <input value={periodName} onChange={e => setPeriodName(e.target.value)}
                            placeholder="e.g. March 2026" className={inputCls} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Start Date</label>
                        <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">End Date</label>
                        <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className={inputCls} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Filter by Location</label>
                        <select value={locationId} onChange={e => setLocationId(e.target.value)} className={inputCls}>
                            <option value="">All Locations</option>
                            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Load Existing Period</label>
                        <select value={loadPeriodId} onChange={e => handleLoadPeriod(e.target.value)} className={inputCls}>
                            <option value="">— Load existing —</option>
                            {existingPeriods.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.status})</option>
                            ))}
                        </select>
                    </div>
                    <div className="lg:col-span-2 flex gap-2">
                        <button onClick={handlePreview} disabled={previewing || !dateStart || !dateEnd}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                            <Eye className="w-4 h-4" />
                            {previewing ? "Loading…" : "Preview Workers"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── PREVIEW TABLE (before generation) ── */}
            {previewData.length > 0 && !period && (
                <div>
                    {/* Summary + generate buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">{previewData.length} workers</span>
                            {" · "}Est. Total Payout: <span className="font-bold text-emerald-600">{formatCurrency(previewTotal)}</span>
                            {selectedIds.size !== previewData.length && (
                                <span className="ml-2 text-purple-600">({selectedIds.size} selected)</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleGenerate("all")} disabled={generating}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                                <Users className="w-4 h-4" />
                                {generating ? "Generating…" : "Generate All"}
                            </button>
                            {locationId && (
                                <button onClick={() => handleGenerate("location")} disabled={generating}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                                    <MapPin className="w-4 h-4" /> Generate by Location
                                </button>
                            )}
                            {selectedIds.size > 0 && selectedIds.size < previewData.length && (
                                <button onClick={() => handleGenerate("selected")} disabled={generating}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-60 shadow-sm">
                                    <User className="w-4 h-4" /> Generate Selected ({selectedIds.size})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Worker preview rows */}
                    <div className="space-y-2">
                        {previewData.map((w) => {
                            const isSelected = selectedIds.has(w.worker.id);
                            const isExpanded = expandedRow === w.worker.id;
                            const hasProfile = w.profile && w.profile.basicSalary > 0;

                            return (
                                <div key={w.worker.id}
                                    className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-colors ${isSelected ? "border-purple-200" : "border-gray-200 opacity-60"}`}>
                                    <div className="flex items-center gap-3 px-4 py-3">
                                        {/* Checkbox */}
                                        <input type="checkbox" checked={isSelected}
                                            onChange={e => {
                                                const next = new Set(selectedIds);
                                                e.target.checked ? next.add(w.worker.id) : next.delete(w.worker.id);
                                                setSelectedIds(next);
                                            }}
                                            className="w-4 h-4 accent-purple-600 shrink-0" />

                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-sm font-bold shrink-0">
                                            {w.worker.name[0]}
                                        </div>

                                        {/* Name + location */}
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-gray-900 text-sm">{w.worker.name}</div>
                                            <div className="text-[11px] text-gray-400">{w.worker.workerId}{w.worker.location ? ` · ${w.worker.location.name}` : ""}</div>
                                        </div>

                                        {/* Stats */}
                                        <div className="hidden md:flex items-center gap-6 text-xs text-gray-500">
                                            <div className="text-center">
                                                <div className="font-semibold text-gray-800">{w.presentDays}d / {w.totalHoursWorked}h</div>
                                                <div>Attendance</div>
                                            </div>
                                            <div className="text-center">
                                                <div className={`font-semibold ${hasProfile ? "text-gray-800" : "text-amber-600"}`}>
                                                    {hasProfile ? formatCurrency(w.profile!.basicSalary) : "Not set"}
                                                </div>
                                                <div>Basic {w.profile?.salaryFrequency === "Daily" ? "(daily)" : "(monthly)"}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-semibold text-blue-600">{formatCurrency(w.allowancesTotal)}</div>
                                                <div>Allowances</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-semibold text-purple-600">{formatCurrency(w.assemblyEarnings)}</div>
                                                <div>Assembly</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-semibold text-rose-600">{formatCurrency(w.deductionsTotal)}</div>
                                                <div>Deductions</div>
                                            </div>
                                        </div>

                                        {/* Est Net Pay */}
                                        <div className="text-right shrink-0 ml-2">
                                            <div className="text-[10px] text-gray-400 uppercase font-semibold">Est. Net Pay</div>
                                            <div className="text-emerald-600 font-bold text-base">{formatCurrency(w.estimatedNet)}</div>
                                        </div>

                                        {/* Expand */}
                                        <button onClick={() => setExpandedRow(isExpanded ? null : w.worker.id)}
                                            className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-600 shrink-0 ml-1">
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Expanded breakdown */}
                                    {isExpanded && (
                                        <div className="border-t border-purple-50 px-4 py-3 bg-purple-25 grid md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Earnings Breakdown</p>
                                                <div className="space-y-1">
                                                    {!hasProfile && (
                                                        <div className="flex items-center gap-1 text-amber-600 text-xs"><AlertTriangle className="w-3 h-3" /> No salary profile — will be Rs. 0</div>
                                                    )}
                                                    <div className="flex justify-between text-gray-600"><span>Basic Salary (est.)</span><span className="font-medium">{formatCurrency(w.estimatedBasic)}</span></div>
                                                    {w.otHours > 0 && <div className="flex justify-between text-gray-600"><span>Overtime ({w.otHours}h)</span><span className="font-medium">{formatCurrency(w.estimatedOt)}</span></div>}
                                                    {w.allowances.map((a, i) => (
                                                        <div key={i} className="flex justify-between text-blue-600"><span>{a.name} ({a.frequency})</span><span>{formatCurrency(a.amount)}</span></div>
                                                    ))}
                                                    {w.assemblyEarnings > 0 && <div className="flex justify-between text-purple-600"><span>Assembly Earnings</span><span>{formatCurrency(w.assemblyEarnings)}</span></div>}
                                                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-purple-100"><span>Gross</span><span>{formatCurrency(w.estimatedGross)}</span></div>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Deductions</p>
                                                {w.deductions.length === 0 ? (
                                                    <p className="text-gray-400 text-xs italic">None</p>
                                                ) : w.deductions.map((d, i) => (
                                                    <div key={i} className="flex justify-between text-rose-600"><span>{d.type} — {d.description}</span><span>- {formatCurrency(d.amount)}</span></div>
                                                ))}
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Salary Config</p>
                                                {w.profile ? (
                                                    <div className="space-y-1 text-gray-600 text-xs">
                                                        <div>Basic: <span className="font-semibold">{formatCurrency(w.profile.basicSalary)} / {w.profile.salaryFrequency === "Daily" ? "day" : "month"}</span></div>
                                                        <div>OT Rate: <span className="font-semibold">Rs. {w.profile.overtimeRate}/hr</span></div>
                                                        <div>Duty: <span className="font-semibold font-mono">{w.profile.dutyStart} → {w.profile.dutyEnd}</span></div>
                                                        <div>Type: <span className="font-semibold">{w.profile.workerType}</span></div>
                                                    </div>
                                                ) : (
                                                    <div className="text-amber-600 text-xs">
                                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                                        No salary profile.{" "}
                                                        <Link href="/dashboard/payroll/profiles" className="underline">Set up now →</Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom generate bar */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                        <button onClick={() => handleGenerate("all")} disabled={generating}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 shadow-sm">
                            <Play className="w-4 h-4" />
                            {generating ? "Generating…" : "Generate All Workers"}
                        </button>
                        {selectedIds.size > 0 && selectedIds.size < previewData.length && (
                            <button onClick={() => handleGenerate("selected")} disabled={generating}
                                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold disabled:opacity-60 shadow-sm">
                                <User className="w-4 h-4" /> Generate {selectedIds.size} Selected
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── GENERATED RECORDS (after generation) ── */}
            {period && (
                <div>
                    {/* Period status bar */}
                    <div className="flex items-center justify-between mb-4 p-4 bg-white border border-purple-100 rounded-2xl shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-lg">{period.name}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isFinalized ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                    {isFinalized ? <Lock className="w-3 h-3" /> : null}{period.status}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                                {new Date(period.periodStart).toLocaleDateString()} → {new Date(period.periodEnd).toLocaleDateString()}
                                {" · "}<span className="font-semibold text-gray-700">{visibleGenerated.length} workers</span>
                                {" · "}Total: <span className="font-bold text-emerald-600">{formatCurrency(generatedTotal)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={`/dashboard/payroll/payslips?periodId=${period.id}`}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium">
                                Full Payslips →
                            </Link>
                        </div>
                    </div>

                    {/* Generated worker rows */}
                    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-purple-50 bg-purple-25">
                                    <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase">Worker</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Days</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Basic</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Allowances</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Assembly</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Deductions</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase">Gross</th>
                                    <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase font-bold">Net Pay</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleGenerated.length === 0 && (
                                    <tr><td colSpan={9} className="text-center py-10 text-gray-400">No records found.</td></tr>
                                )}
                                {visibleGenerated.map((r: GeneratedRecord) => (
                                    <>
                                        <tr key={r.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{r.worker.name}</div>
                                                {r.worker.location && <div className="text-[11px] text-gray-400">{r.worker.location.name}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-600">{r.presentDays}d</td>
                                            <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(r.basicSalary)}</td>
                                            <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(r.allowancesTotal)}</td>
                                            <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(r.assemblyEarnings)}</td>
                                            <td className="px-4 py-3 text-right text-rose-600">{r.deductionsTotal > 0 ? `- ${formatCurrency(r.deductionsTotal)}` : "—"}</td>
                                            <td className="px-4 py-3 text-right text-gray-800">{formatCurrency(r.grossPay)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600 text-base">{formatCurrency(r.netPay)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button onClick={() => setExpandedRow(expandedRow === r.id ? null : r.id)}
                                                    className="p-1.5 hover:bg-purple-50 rounded-lg text-purple-400">
                                                    {expandedRow === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedRow === r.id && (
                                            <tr key={`${r.id}-exp`} className="bg-purple-25">
                                                <td colSpan={9} className="px-6 py-3">
                                                    <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-600">
                                                        <div>
                                                            <p className="font-bold text-gray-400 uppercase mb-1">Allowances</p>
                                                            {r.allowanceLines.length === 0 ? <p className="italic text-gray-400">None</p> :
                                                                r.allowanceLines.map((a: any) => (
                                                                    <div key={a.id} className="flex justify-between"><span>{a.name}</span><span className="text-blue-600">{formatCurrency(a.amount)}</span></div>
                                                                ))}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-400 uppercase mb-1">Deductions</p>
                                                            {r.deductionLines.length === 0 ? <p className="italic text-gray-400">None</p> :
                                                                r.deductionLines.map((d: any) => (
                                                                    <div key={d.id} className="flex justify-between"><span>{d.type} — {d.description}</span><span className="text-rose-600">- {formatCurrency(d.amount)}</span></div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                            {visibleGenerated.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-purple-100 bg-purple-25">
                                        <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-600">Total ({visibleGenerated.length} workers)</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                                            {formatCurrency(visibleGenerated.reduce((s, r) => s + r.grossPay, 0))}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-emerald-600 text-base">
                                            {formatCurrency(generatedTotal)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Bottom action bar */}
                    {!isFinalized && (
                        <div className="mt-4 flex justify-end gap-3">
                            {canAdminDelete && (
                                <button onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium shadow-sm">
                                    <Trash2 className="w-4 h-4" /> Delete & Regenerate
                                </button>
                            )}
                            <button onClick={handleFinalize}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm">
                                <CheckCircle className="w-4 h-4" /> Finalize Payroll
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Empty state ── */}
            {!previewing && previewData.length === 0 && !period && (
                <div className="text-center py-16 text-gray-400 bg-white border border-dashed border-purple-200 rounded-2xl">
                    <Wallet className="w-10 h-10 mx-auto mb-3 text-purple-200" />
                    <p className="font-medium text-gray-500">Set the period dates and click <strong>Preview Workers</strong></p>
                    <p className="text-sm mt-1">You'll see every worker's salary, allowances, deductions and assembly earnings before generating</p>
                </div>
            )}
        </div>
    );
}

function Wallet({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    );
}
