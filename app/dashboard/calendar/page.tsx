"use client";
import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Trash2 } from "lucide-react";

const SL_HOLIDAYS_2026 = [
    { date: "2026-01-01", name: "New Year's Day" },
    { date: "2026-01-13", name: "Thai Pongal" },
    { date: "2026-01-14", name: "Duruthu Full Moon Poya" },
    { date: "2026-02-04", name: "Independence Day" },
    { date: "2026-02-12", name: "Navam Full Moon Poya" },
    { date: "2026-03-02", name: "Maha Sivarathri" },
    { date: "2026-03-13", name: "Medin Full Moon Poya" },
    { date: "2026-04-02", name: "Good Friday" },
    { date: "2026-04-13", name: "Bak Full Moon Poya" },
    { date: "2026-04-13", name: "Sinhala & Tamil New Year Eve" },
    { date: "2026-04-14", name: "Sinhala & Tamil New Year" },
    { date: "2026-04-23", name: "Eid ul Fitr (Ramadan)" },
    { date: "2026-05-01", name: "May Day" },
    { date: "2026-05-13", name: "Wesak Full Moon Poya" },
    { date: "2026-05-14", name: "Wesak Day Holiday" },
    { date: "2026-06-11", name: "Poson Full Moon Poya" },
    { date: "2026-06-30", name: "Eid ul Alha" },
    { date: "2026-07-11", name: "Esala Full Moon Poya" },
    { date: "2026-08-09", name: "Nikini Full Moon Poya" },
    { date: "2026-08-27", name: "Milad-un-Nabi" },
    { date: "2026-09-08", name: "Binara Full Moon Poya" },
    { date: "2026-10-07", name: "Vap Full Moon Poya" },
    { date: "2026-10-20", name: "Deepavali" },
    { date: "2026-11-05", name: "Ill Full Moon Poya" },
    { date: "2026-12-05", name: "Unduvap Full Moon Poya" },
    { date: "2026-12-25", name: "Christmas Day" },
];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
    const [seeding, setSeeding] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startWeekDay = getDay(monthStart); // 0=Sun

    const loadHolidays = useCallback(async () => {
        const res = await fetch(`/api/holidays?year=${year}`);
        setHolidays(await res.json());
    }, [year]);
    useEffect(() => { loadHolidays(); }, [loadHolidays]);

    const getHoliday = (day: Date) => holidays.find(h => isSameDay(new Date(h.date), day));

    const seedHolidays = async () => {
        setSeeding(true);
        await fetch("/api/holidays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(SL_HOLIDAYS_2026.map(h => ({ ...h, editable: true }))),
        });
        loadHolidays(); setSeeding(false);
    };

    const addHoliday = async () => {
        if (!newHoliday.date || !newHoliday.name) return;
        await fetch("/api/holidays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newHoliday),
        });
        setNewHoliday({ date: "", name: "" }); setShowAdd(false); loadHolidays();
    };

    const delHoliday = async (id: number) => {
        await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
        loadHolidays();
    };

    const isToday = (day: Date) => isSameDay(day, new Date());

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Sri Lankan mercantile holidays & attendance calendar</p>
                </div>
                <div className="flex gap-2">
                    {holidays.length === 0 && (
                        <button onClick={seedHolidays} disabled={seeding} className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-xs font-medium transition-colors">
                            {seeding ? "Loading…" : "🇱🇰 Load SL Holidays 2026"}
                        </button>
                    )}
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Add Holiday
                    </button>
                </div>
            </div>

            {showAdd && (
                <div className="bg-white border border-purple-100 rounded-2xl p-5 mb-6 shadow-sm flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Date</label>
                        <input type="date" value={newHoliday.date} onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block font-medium">Holiday Name</label>
                        <input value={newHoliday.name} onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Extra holiday" className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                    </div>
                    <button onClick={addHoliday} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium">Add</button>
                    <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className="bg-white border border-purple-100 rounded-2xl p-6 shadow-sm">
                {/* Nav */}
                <div className="flex items-center justify-between mb-5">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-lg font-semibold text-gray-800">{format(currentDate, "MMMM yyyy")}</h2>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                        <div key={d} className="text-center text-xs text-gray-400 font-medium py-2">{d}</div>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startWeekDay }).map((_, i) => <div key={`e${i}`} />)}
                    {days.map(day => {
                        const holiday = getHoliday(day);
                        const today = isToday(day);
                        const isSun = getDay(day) === 0;
                        return (
                            <div key={day.toISOString()}
                                className={`min-h-[56px] p-1.5 rounded-xl text-xs transition-colors relative group
                                    ${today ? "bg-purple-600 text-white shadow-md z-10 scale-105" : holiday ? "bg-red-50 border border-red-100" : isSun ? "bg-gray-50/50" : "hover:bg-purple-50"}`}>
                                <div className={`font-bold text-sm ${today ? "text-white" : holiday ? "text-red-600" : isSun ? "text-red-400" : "text-gray-700"}`}>
                                    {format(day, "d")}
                                </div>
                                {holiday && (
                                    <div className="flex items-start justify-between mt-1">
                                        <span className="text-red-500 leading-tight text-[9px] font-medium">{holiday.name}</span>
                                        {holiday.editable && (
                                            <button onClick={() => delHoliday(holiday.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-100 rounded">
                                                <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                        );
                    })}
                </div>
            </div>

            {/* Holiday list below */}
            <div className="mt-6 bg-white border border-purple-100 rounded-2xl p-5 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3">Holidays in {format(currentDate, "MMMM yyyy")}</h3>
                {holidays.filter(h => new Date(h.date).getMonth() === month && new Date(h.date).getFullYear() === year).length === 0 ? (
                    <p className="text-gray-400 text-sm">No holidays this month.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {holidays
                            .filter(h => new Date(h.date).getMonth() === month && new Date(h.date).getFullYear() === year)
                            .map(h => (
                                <div key={h.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                    <div>
                                        <span className="font-medium text-gray-800 text-sm">{h.name}</span>
                                        <span className="ml-2 text-gray-400 text-xs">{format(new Date(h.date), "EEEE, d MMM")}</span>
                                    </div>
                                    {h.editable && (
                                        <button onClick={() => delHoliday(h.id)} className="p-1 hover:bg-red-50 rounded text-red-400 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
}
