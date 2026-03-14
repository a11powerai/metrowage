import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

import { getSessionContext } from "@/lib/session-utils";

export async function GET() {
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const periods = await prisma.payrollPeriod.findMany({
        orderBy: { periodStart: "desc" },
        include: { _count: { select: { records: true } } },
    });
    return NextResponse.json(periods);
}

export async function POST(req: Request) {
    const body = await req.json();
    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, periodStart, periodEnd, workerIds, locationId } = body;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Create or find existing period
    let period = await prisma.payrollPeriod.findFirst({
        where: { name, periodStart: start, periodEnd: end }
    });

    if (!period) {
        period = await prisma.payrollPeriod.create({
            data: { name, periodStart: start, periodEnd: end },
        });
    }

    const holidays = await prisma.holiday.findMany({
        where: { date: { gte: startOfDay(start), lte: endOfDay(end) } }
    });
    const holidayDates = new Set(holidays.map(h => startOfDay(h.date).getTime()));

    // Get active workers for the location, optionally filtered by workerIds or explicit locationId
    const workerFilter: any = {
        status: "Active",
        ...ctx.getLocationFilter()
    };
    // Allow Admin/SuperAdmin to target a specific location when generating payroll
    if (locationId && (ctx.role === "SuperAdmin" || ctx.role === "Admin")) {
        workerFilter.locationId = Number(locationId);
    }
    if (workerIds && Array.isArray(workerIds)) {
        workerFilter.id = { in: workerIds.map(Number) };
    }

    const workers = await prisma.worker.findMany({
        where: workerFilter,
        include: { salaryProfile: true },
    });

    // For each worker, compute their payroll record
    for (const worker of workers) {
        const profile = worker.salaryProfile;

        // --- Assembly Earnings: only from Finalized days in the period ---
        const assemblyLines = await prisma.productionLine.findMany({
            where: {
                workerId: worker.id,
                day: {
                    status: "Finalized",
                    date: { gte: startOfDay(start), lte: endOfDay(end) },
                },
            },
            include: { product: true, day: true },
        });

        const assemblyEarnings = assemblyLines.reduce((s, l) => s + l.lineTotal, 0);

        // --- Allowances (with Daily/Weekly frequency scaling) ---
        const allowances = await prisma.allowance.findMany({
            where: { workerId: worker.id, active: true },
        });
        const periodDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
        const workWeeks = Math.max(1, Math.round(periodDays / 7));

        // --- Standard hours per day: full shift duration including breaks ---
        // Overtime is earned only AFTER completing the full standard shift hours.
        // e.g. 08:00–17:00 = 9h standard (including breaks); OT starts only after 9 hours worked.
        let standardHoursPerDay = 9; // Default fallback
        if (profile?.dutyStart && profile?.dutyEnd) {
            const [startH, startM] = profile.dutyStart.split(':').map(Number);
            const [endH, endM] = profile.dutyEnd.split(':').map(Number);
            const diffHours = (endH + endM / 60) - (startH + startM / 60);
            // Full shift duration is used as OT threshold (breaks are included in standard hours)
            if (diffHours > 0) standardHoursPerDay = diffHours;
        }

        const attendances = await prisma.attendance.findMany({
            where: { workerId: worker.id, date: { gte: start, lte: end }, status: "Present" },
        });
        const presentDaysCount = attendances.length;
        const effectiveDays = presentDaysCount > 0 ? presentDaysCount : periodDays;

        let regularHoursSum = 0;
        let autoOtHoursSum = 0;

        for (const att of attendances) {
            const isHoliday = holidayDates.has(startOfDay(att.date).getTime());
            // fallback to their standard hours if present but no hours recorded (e.g. forgot checkout)
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

        // Total actual hours worked and total scheduled hours for the period
        const totalHoursWorked = Math.round((regularHoursSum + autoOtHoursSum) * 100) / 100;
        const totalScheduledHours = Math.round(standardHoursPerDay * periodDays * 100) / 100;

        const allowancesTotal = Math.round(allowances.reduce((s, a) => {
            if (a.frequency === "Daily") return s + a.amount * effectiveDays;
            if (a.frequency === "Weekly") return s + a.amount * workWeeks;
            return s + a.amount; // Monthly or OneTime
        }, 0));

        // --- Approved Commissions in period ---
        const commissions = await prisma.commission.findMany({
            where: {
                workerId: worker.id,
                approved: true,
                periodStart: { gte: start },
                periodEnd: { lte: end },
            },
        });
        const commissionsTotal = Math.round(commissions.reduce((s, c) => s + c.amount, 0));

        // --- All unapplied deductions for this worker ---
        const deductions = await prisma.deduction.findMany({
            where: {
                workerId: worker.id,
                applied: false,
            },
        });
        const deductionsTotal = Math.round(deductions.reduce((s, d) => s + d.amount, 0));

        const basicSalaryAmount = profile?.basicSalary ?? 0;
        const salaryFreq = profile?.salaryFrequency ?? "Monthly";
        let basicSalary = 0;

        if (salaryFreq === "Daily") {
            // For Daily workers, 'basicSalary' represents their daily rate.
            // Paid for Present Days.
            basicSalary = Math.round(basicSalaryAmount * presentDaysCount);
        } else {
            // Monthly workers
            // We use standard 26 days * standardHoursPerDay to prorate hours worked.
            const standardHoursPerMonth = 26 * standardHoursPerDay;
            if (standardHoursPerMonth > 0) {
                basicSalary = Math.round((basicSalaryAmount / standardHoursPerMonth) * regularHoursSum);
            }
        }

        const manualOt = body.overtimeHours?.[worker.id] ?? 0;
        const overtimeHours = autoOtHoursSum + manualOt;
        const overtimePay = Math.round((profile?.overtimeRate ?? 0) * overtimeHours);

        const grossPay = basicSalary + overtimePay + allowancesTotal + commissionsTotal + assemblyEarnings;
        const netPay = Math.max(0, grossPay - deductionsTotal);

        // Upsert payroll record
        await prisma.payrollRecord.upsert({
            where: { periodId_workerId: { periodId: period.id, workerId: worker.id } },
            create: {
                periodId: period.id,
                workerId: worker.id,
                basicSalary,
                overtimeHours,
                overtimePay,
                allowancesTotal,
                commissionsTotal,
                assemblyEarnings,
                deductionsTotal,
                grossPay,
                netPay,
                presentDays: presentDaysCount,
                totalHoursWorked,
                totalScheduledHours,
                assemblyLines: {
                    create: assemblyLines.map(l => ({
                        date: l.day.date,
                        productName: l.product.name,
                        quantity: l.quantity,
                        appliedRate: l.appliedRate,
                        lineTotal: l.lineTotal,
                    })),
                },
                allowanceLines: {
                    create: allowances.map(a => ({ name: a.name, amount: Math.round(a.amount) })),
                },
                deductionLines: {
                    create: deductions.map(d => ({ type: d.type, description: d.description, amount: Math.round(d.amount) })),
                },
                commissionLines: {
                    create: commissions.map(c => ({ series: c.series, amount: Math.round(c.amount) })),
                },
            },
            update: {
                basicSalary,
                overtimeHours,
                overtimePay,
                allowancesTotal,
                commissionsTotal,
                assemblyEarnings,
                deductionsTotal,
                grossPay,
                netPay,
                presentDays: presentDaysCount,
                totalHoursWorked,
                totalScheduledHours,
            }
        });

        // Mark deductions as applied
        if (deductions.length > 0) {
            await prisma.deduction.updateMany({
                where: { id: { in: deductions.map(d => d.id) } },
                data: { applied: true },
            });
        }
    }

    // Audit log
    await prisma.auditLog.create({
        data: { periodId: period.id, userId: 1, action: "GENERATE", detail: `Payroll generated for period: ${name}` },
    });

    return NextResponse.json({ id: period.id }, { status: 201 });
}
