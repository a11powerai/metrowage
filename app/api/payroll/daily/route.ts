import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    
    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ error: "Start and end dates are required" }, { status: 400 });
    }

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: startOfDay(start), lte: endOfDay(end) } }
    });
    const holidayDates = new Set(holidays.map(h => startOfDay(h.date).getTime()));

    const workers = await prisma.worker.findMany({
        where: { status: "Active", ...ctx.getLocationFilter() },
        include: { salaryProfile: true, location: { include: { factory: true } } },
    });

    const results = [];

    for (const worker of workers) {
        const profile = worker.salaryProfile;
        if (!profile) continue;

        let standardHoursPerDay = 9;
        if (profile.dutyStart && profile.dutyEnd) {
            const [startH, startM] = profile.dutyStart.split(':').map(Number);
            const [endH, endM] = profile.dutyEnd.split(':').map(Number);
            let diffHours = (endH + endM / 60) - (startH + startM / 60);
            if (diffHours > 5) diffHours -= 1;
            if (diffHours > 0) standardHoursPerDay = diffHours;
        }

        const attendances = await prisma.attendance.findMany({
            where: { workerId: worker.id, date: { gte: start, lte: end }, status: "Present" },
        });

        const presentDaysCount = attendances.length;

        let regularHoursSum = 0;
        let autoOtHoursSum = 0;

        for (const att of attendances) {
            const isHoliday = holidayDates.has(startOfDay(att.date).getTime());
            let hw = (att.hoursWorked && att.hoursWorked > 0) ? att.hoursWorked : standardHoursPerDay;

            if (isHoliday) {
                autoOtHoursSum += hw;
            } else {
                if (hw > standardHoursPerDay) {
                    regularHoursSum += standardHoursPerDay;
                    autoOtHoursSum += (hw - standardHoursPerDay);
                } else {
                    regularHoursSum += hw;
                }
            }
        }

        const basicSalaryAmount = profile.basicSalary ?? 0;
        const salaryFreq = profile.salaryFrequency ?? "Monthly";
        let calculatedBaseSalary = 0;

        if (salaryFreq === "Daily") {
            calculatedBaseSalary = Math.round(basicSalaryAmount * presentDaysCount);
        } else {
            const standardHoursPerMonth = 26 * standardHoursPerDay;
            if (standardHoursPerMonth > 0) {
                calculatedBaseSalary = Math.round((basicSalaryAmount / standardHoursPerMonth) * regularHoursSum);
            }
        }

        const overtimeHours = profile.allowOvertime ? autoOtHoursSum : 0;
        const overtimePay = Math.round((profile.overtimeRate ?? 0) * overtimeHours);

        results.push({
            workerId: worker.id,
            workerName: worker.name,
            locationName: worker.location?.name ?? "-",
            factoryName: worker.location?.factory?.name ?? "Main Factory",
            workerType: profile.workerType,
            salaryFrequency: salaryFreq,
            dailyRate: salaryFreq === "Daily" ? basicSalaryAmount : "-",
            presentDays: presentDaysCount,
            baseSalary: calculatedBaseSalary,
            allowOvertime: profile.allowOvertime,
            overtimeHours,
            overtimePay
        });
    }

    return NextResponse.json(results);
}
