"use client";
import { useEffect, useState, useCallback } from "react";
import { format, startOfDay } from "date-fns";
import { Clock, LogIn, LogOut, Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const statusColors: Record<string, string> = {
    Present: "bg-green-100 text-green-700",
    Absent: "bg-red-100 text-red-500",
    Leave: "bg-yellow-100 text-yellow-700",
    Holiday: "bg-purple-100 text-purple-600",
};

export default function AttendancePage() {
    const [workers, setWorkers] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [loading, setLoading] = useState(false);
    const [monthStats, setMonthStats] = useState<{ workerId: number; hours: number; days: number }[]>([]);

    const loadData = useCallback(async () => {
        const [wRes, aRes] = await Promise.all([
            fetch("/api/workers"),
            fetch(`/api/attendance?date=${date}`),
        ]);
        const ws = await wRes.json();
        const att = await aRes.json();
        setWorkers(ws);
        setRecords(att);
    }, [date]);

    // Monthly hours for current month
    const loadMonthStats = async () => {
        const now = new Date();
        const start = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
        const end = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
        const res = await fetch(`/api/attendance?dateFrom=${start}&dateTo=${end}`);
        const att = await res.json();
        const stats: Record<number, { hours: number; days: number }> = {};
        for (const a of att) {
            if (!stats[a.workerId]) stats[a.workerId] = { hours: 0, days: 0 };
            stats[a.workerId].hours += a.hoursWorked ?? 0;
            if (a.status === "Present") stats[a.workerId].days++;
        }
        setMonthStats(Object.entries(stats).map(([id, s]) => ({ workerId: Number(id), ...s })));
    };

    useEffect(() => { loadData(); loadMonthStats(); }, [loadData]);

    const getRecord = (workerId: number) => records.find(r => r.workerId === workerId);

    const checkIn = async (worker: any) => {
        setLoading(true);
        const now = new Date().toISOString();
        let lat: number | null = null, lng: number | null = null;
        if (worker.allowGeoCheckin || worker.location) {
            try {
                const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } catch { }
        }
        await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workerId: worker.id, date, checkInTime: now, checkInLat: lat, checkInLng: lng, status: "Present" }),
        });
        loadData(); setLoading(false);
    };

    const checkOut = async (record: any) => {
        setLoading(true);
        const now = new Date().toISOString();
        await fetch(`/api/attendance/${record.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ checkOutTime: now }),
        });
        loadData(); setLoading(false);
    };

    const markAbsent = async (worker: any) => {
        setLoading(true);
        await fetch("/api/attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workerId: worker.id, date, status: "Absent" }),
        });
        loadData(); setLoading(false);
    };

    const activeWorkers = workers.filter(w => w.status === "Active");

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Daily time-in / time-out tracking</p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-gray-700"
                    />
                </div>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: "Present", val: records.filter(r => r.status === "Present").length, color: "text-green-600", bg: "bg-green-50" },
                    { label: "Absent", val: records.filter(r => r.status === "Absent").length, color: "text-red-500", bg: "bg-red-50" },
                    { label: "Not Marked", val: activeWorkers.filter(w => !getRecord(w.id)).length, color: "text-gray-500", bg: "bg-gray-50" },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-gray-500 text-xs">{s.label}</div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Check-In</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Check-Out</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Hours</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">This Month</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeWorkers.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400">No active workers.</td></tr>
                        )}
                        {activeWorkers.map(w => {
                            const rec = getRecord(w.id);
                            const monthStat = monthStats.find(s => s.workerId === w.id);
                            return (
                                <tr key={w.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800">{w.name}</div>
                                        <div className="text-xs text-purple-500 font-mono">{w.workerId}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {rec ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rec.status] ?? "bg-gray-100 text-gray-500"}`}>
                                                {rec.status === "Present" ? <CheckCircle className="w-3 h-3" /> : rec.status === "Absent" ? <XCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                {rec.status}
                                            </span>
                                        ) : <span className="text-gray-400 text-xs">Not marked</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                                        {rec?.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "—"}
                                        {rec?.checkInLat && <span className="ml-1 text-purple-400" title={`${rec.checkInLat}, ${rec.checkInLng}`}>📍</span>}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                                        {rec?.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                        {rec?.hoursWorked ? `${rec.hoursWorked}h` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {monthStat ? `${monthStat.days}d / ${monthStat.hours.toFixed(1)}h` : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {!rec && (
                                                <>
                                                    <button onClick={() => checkIn(w)} disabled={loading} className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs flex items-center gap-1 transition-colors">
                                                        <LogIn className="w-3 h-3" /> In
                                                    </button>
                                                    <button onClick={() => markAbsent(w)} disabled={loading} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs flex items-center gap-1 transition-colors">
                                                        <XCircle className="w-3 h-3" /> Absent
                                                    </button>
                                                </>
                                            )}
                                            {rec?.status === "Present" && !rec.checkOutTime && (
                                                <button onClick={() => checkOut(rec)} disabled={loading} className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-xs flex items-center gap-1 transition-colors">
                                                    <LogOut className="w-3 h-3" /> Out
                                                </button>
                                            )}
                                            {rec?.checkOutTime && <span className="text-xs text-green-600 font-medium">✓ Done</span>}
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
