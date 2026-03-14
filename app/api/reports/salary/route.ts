import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/session-utils";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url, "http://n");
    const periodId = searchParams.get("periodId");

    const ctx = await getSessionContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!periodId) {
         // Return latest finalized or all periods to select from
        return NextResponse.json({ error: "periodId required" }, { status: 400 });
    }

    const period: any = await prisma.payrollPeriod.findUnique({
        where: { id: Number(periodId) },
        include: {
            records: {
                where: { worker: { ...ctx.getLocationFilter() } },
                include: {
                    worker: {
                        include: {
                            location: {
                                include: { factory: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locationMap: Record<string, any> = {};
    let overallGross = 0;
    let overallNet = 0;
    let overallDeductions = 0;
    let overallBasic = 0;
    let overallWorkers = 0;

    for (const r of period.records) {
        const facName = r.worker?.location?.factory?.name || "Unassigned Factory";
        const locName = r.worker?.location?.name || "Unassigned Location";
        const key = `${facName} — ${locName}`;

        if (!locationMap[key]) {
            locationMap[key] = {
                factory: facName,
                location: locName,
                workerCount: 0,
                basicSalary: 0,
                overtimePay: 0,
                allowances: 0,
                commissions: 0,
                assemblyEarnings: 0,
                grossPay: 0,
                deductions: 0,
                netPay: 0
            };
        }

        const loc = locationMap[key];
        loc.workerCount++;
        loc.basicSalary += r.basicSalary;
        loc.overtimePay += r.overtimePay;
        loc.allowances += r.allowancesTotal;
        loc.commissions += r.commissionsTotal;
        loc.assemblyEarnings += r.assemblyEarnings;
        loc.grossPay += r.grossPay;
        loc.deductions += r.deductionsTotal;
        loc.netPay += r.netPay;

        overallGross += r.grossPay;
        overallNet += r.netPay;
        overallDeductions += r.deductionsTotal;
        overallBasic += r.basicSalary;
        overallWorkers++;
    }

    return NextResponse.json({
        periodName: period.name,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        locations: Object.values(locationMap).sort((a: any, b: any) => a.factory.localeCompare(b.factory) || a.location.localeCompare(b.location)),
        overall: {
            workerCount: overallWorkers,
            grossPay: overallGross,
            deductions: overallDeductions,
            netPay: overallNet,
            basicSalary: overallBasic
        }
    });
}
