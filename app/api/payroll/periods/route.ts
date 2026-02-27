import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
    const periods = await prisma.payrollPeriod.findMany({
        orderBy: { periodStart: "desc" },
        include: { _count: { select: { records: true } } },
    });
    return NextResponse.json(periods);
}

export async function POST(req: Request) {
    const body = await req.json();
    const { name, periodStart, periodEnd } = body;
    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Create the payroll period
    const period = await prisma.payrollPeriod.create({
        data: { name, periodStart: start, periodEnd: end },
    });

    // Get all active workers
    const workers = await prisma.worker.findMany({
        where: { status: "Active" },
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
        const presentDays = await prisma.attendance.count({
            where: { workerId: worker.id, date: { gte: start, lte: end }, status: "Present" },
        });
        const effectiveDays = presentDays > 0 ? presentDays : periodDays;

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

        // presentDays for payroll record
        const presentDaysCount = presentDays;

        // --- Basic salary & OT ---
        const basicSalary = Math.round(profile?.basicSalary ?? 0);
        const overtimeHours = body.overtimeHours?.[worker.id] ?? 0;
        const overtimePay = Math.round((profile?.overtimeRate ?? 0) * overtimeHours);

        const grossPay = basicSalary + overtimePay + allowancesTotal + commissionsTotal + assemblyEarnings;
        const netPay = Math.max(0, grossPay - deductionsTotal);

        // Create payroll record with breakdown lines
        const record = await prisma.payrollRecord.create({
            data: {
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
