import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const start = new Date(searchParams.get("start") ?? "");
    const end = new Date(searchParams.get("end") ?? "");
    const locationId = searchParams.get("locationId");
    const workerIdsParam = searchParams.get("workerIds");

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: startOfDay(start), lte: endOfDay(end) } }
    });
    const holidayDates = new Set(holidays.map(h => startOfDay(h.date).getTime()));

    const workerFilter: any = { status: "Active", ...ctx.getLocationFilter() };
    if (locationId && (ctx.role === "SuperAdmin" || ctx.role === "Admin")) {
        workerFilter.locationId = Number(locationId);
    }
    if (workerIdsParam) {
        workerFilter.id = { in: workerIdsParam.split(",").map(Number) };
    }

    const workers = await prisma.worker.findMany({
        where: workerFilter,
        include: { salaryProfile: true, location: true },
        orderBy: { name: "asc" },
    });

    const periodDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const workWeeks = Math.max(1, Math.round(periodDays / 7));

    const results = await Promise.all(workers.map(async (worker) => {
        const profile = worker.salaryProfile;

        // Standard hours per day (full shift including breaks — OT starts after this)
        let standardHoursPerDay = 9;
        if (profile?.dutyStart && profile?.dutyEnd) {
            const [sh, sm] = profile.dutyStart.split(":").map(Number);
            const [eh, em] = profile.dutyEnd.split(":").map(Number);
            const diff = (eh + em / 60) - (sh + sm / 60);
            if (diff > 0) standardHoursPerDay = diff;
        }

        const attendances = await prisma.attendance.findMany({
            where: { workerId: worker.id, date: { gte: start, lte: end }, status: "Present" },
        });
        const presentDays = attendances.length;
        const effectiveDays = presentDays > 0 ? presentDays : periodDays;

        let regularHours = 0, otHours = 0;
        for (const att of attendances) {
            const isHoliday = holidayDates.has(startOfDay(att.date).getTime());
            const hw = (att.hoursWorked && att.hoursWorked > 0) ? att.hoursWorked : standardHoursPerDay;
            if (isHoliday) {
                otHours += hw;
            } else if (hw > standardHoursPerDay) {
                regularHours += standardHoursPerDay;
                otHours += hw - standardHoursPerDay;
            } else {
                regularHours += hw;
            }
        }
        const totalHoursWorked = Math.round((regularHours + otHours) * 100) / 100;

        const allowances = await prisma.allowance.findMany({ where: { workerId: worker.id, active: true } });
        const allowancesTotal = Math.round(allowances.reduce((s, a) => {
            if (a.frequency === "Daily") return s + a.amount * effectiveDays;
            if (a.frequency === "Weekly") return s + a.amount * workWeeks;
            return s + a.amount;
        }, 0));

        const deductions = await prisma.deduction.findMany({ where: { workerId: worker.id, applied: false } });
        const deductionsTotal = Math.round(deductions.reduce((s, d) => s + d.amount, 0));

        const assemblyLines = await prisma.productionLine.findMany({
            where: {
                workerId: worker.id,
                day: { status: "Finalized", date: { gte: startOfDay(start), lte: endOfDay(end) } },
            },
            include: { product: true },
        });
        const assemblyEarnings = assemblyLines.reduce((s, l) => s + l.lineTotal, 0);

        const basicSalaryAmount = profile?.basicSalary ?? 0;
        let estimatedBasic = 0;
        if ((profile?.salaryFrequency ?? "Monthly") === "Daily") {
            estimatedBasic = Math.round(basicSalaryAmount * presentDays);
        } else {
            const stdMonthly = 26 * standardHoursPerDay;
            if (stdMonthly > 0) estimatedBasic = Math.round((basicSalaryAmount / stdMonthly) * regularHours);
        }
        const estimatedOt = Math.round((profile?.overtimeRate ?? 0) * otHours);
        const estimatedGross = estimatedBasic + estimatedOt + allowancesTotal + assemblyEarnings;
        const estimatedNet = Math.max(0, estimatedGross - deductionsTotal);

        return {
            worker: {
                id: worker.id,
                workerId: worker.workerId,
                name: worker.name,
                locationId: worker.locationId,
                location: worker.location ? { name: worker.location.name } : null,
            },
            profile: profile ? {
                basicSalary: profile.basicSalary,
                salaryFrequency: profile.salaryFrequency,
                overtimeRate: profile.overtimeRate,
                workerType: profile.workerType,
                dutyStart: profile.dutyStart,
                dutyEnd: profile.dutyEnd,
            } : null,
            presentDays,
            totalHoursWorked,
            standardHoursPerDay,
            otHours: Math.round(otHours * 100) / 100,
            allowances: allowances.map(a => ({ name: a.name, amount: Math.round(a.amount), frequency: a.frequency })),
            allowancesTotal,
            deductions: deductions.map(d => ({ type: d.type, description: d.description, amount: Math.round(d.amount) })),
            deductionsTotal,
            assemblyEarnings,
            estimatedBasic,
            estimatedOt,
            estimatedGross,
            estimatedNet,
        };
    }));

    return NextResponse.json(results);
}
