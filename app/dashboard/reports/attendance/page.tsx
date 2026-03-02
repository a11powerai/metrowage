"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, AlertCircle, Clock, Users, Calendar } from "lucide-react";

const statusColors: Record<string, string> = {
    Present: "bg-green-100 text-green-700",
    Absent: "bg-red-100 text-red-500",
    Leave: "bg-yellow-100 text-yellow-700",
    Holiday: "bg-purple-100 text-purple-600",
};

export default function AttendanceReportPage() {
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        const res = await fetch(`/api/reports/attendance?date=${date}`);
        setData(await res.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, [date]);

    const summary = [
        { label: "Present", val: data?.present ?? 0, color: "text-green-600", bg: "bg-green-50", border: "border-green-100", icon: CheckCircle },
        { label: "Absent", val: data?.absent ?? 0, color: "text-red-500", bg: "bg-red-50", border: "border-red-100", icon: XCircle },
        { label: "On Leave", val: data?.onLeave ?? 0, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-100", icon: AlertCircle },
        { label: "Holiday", val: data?.holiday ?? 0, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", icon: Calendar },
        { label: "Not Marked", val: data?.pending ?? 0, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-100", icon: Clock },
        { label: "Total Workers", val: data?.total ?? 0, color: "text-gray-700", bg: "bg-white", border: "border-gray-200", icon: Users },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Daily present / absent summary</p>
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

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {summary.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`${s.bg} rounded-2xl p-4 border ${s.border} shadow-sm`}>
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 ${s.color}`} />
                                <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                            </div>
                            <div className={`text-3xl font-bold ${s.color}`}>{loading ? "…" : s.val}</div>
                        </div>
                    );
                })}
            </div>

            {/* Worker details table */}
            <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-purple-50">
                    <h2 className="font-semibold text-gray-800 text-sm">Worker Details — {date}</h2>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-purple-50">
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Worker</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Check-In</th>
                            <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Check-Out</th>
                            <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>}
                        {!loading && data?.workers?.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400">No workers found.</td></tr>
                        )}
                        {!loading && data?.workers?.map((w: any) => {
                            const rec = data.records?.find((r: any) => r.workerId === w.id);
                            return (
                                <tr key={w.id} className="border-b border-gray-50 hover:bg-purple-25 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800">{w.name}</div>
                                        <div className="text-xs text-purple-500 font-mono">{w.workerId}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {rec ? (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[rec.status] ?? "bg-gray-100 text-gray-500"}`}>
                                                {rec.status}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                                                Not Marked
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                                        {rec?.checkInTime ? format(new Date(rec.checkInTime), "HH:mm") : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                                        {rec?.checkOutTime ? format(new Date(rec.checkOutTime), "HH:mm") : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600 text-xs">
                                        {rec?.hoursWorked ? `${rec.hoursWorked}h` : "—"}
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
