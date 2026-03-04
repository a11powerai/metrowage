/**
 * Payroll Utility Functions
 * 
 * Standard Working Hours: 8:00 AM - 5:30 PM (9.5 hours total, ~1 hour break = 8 standard hours)
 * Overtime: Any hours worked beyond 8 standard hours per day
 */

export const STANDARD_HOURS_PER_DAY = 8;
export const STANDARD_DAYS_PER_MONTH = 26;
export const STANDARD_HOURS_PER_MONTH = STANDARD_HOURS_PER_DAY * STANDARD_DAYS_PER_MONTH; // 208

export const SHIFT_START_HOUR = 8;   // 8:00 AM
export const SHIFT_START_MIN = 0;
export const SHIFT_END_HOUR = 17;    // 5:30 PM
export const SHIFT_END_MIN = 30;

/**
 * Calculate hours worked from check-in and check-out times.
 * Deducts a 1-hour lunch break if worked > 5 hours.
 */
export function calculateHoursWorked(checkIn: Date, checkOut: Date): number {
    const diffMs = checkOut.getTime() - checkIn.getTime();
    let hours = diffMs / (1000 * 60 * 60);

    // Deduct 1 hour lunch break if worked more than 5 hours
    if (hours > 5) {
        hours -= 1;
    }

    return Math.max(0, parseFloat(hours.toFixed(2)));
}

/**
 * Calculate overtime hours for a single day.
 * OT = max(0, hoursWorked - STANDARD_HOURS_PER_DAY)
 */
export function calculateOvertimeHours(hoursWorked: number): number {
    return Math.max(0, parseFloat((hoursWorked - STANDARD_HOURS_PER_DAY).toFixed(2)));
}

/**
 * Calculate daily basic salary amount.
 * dailyRate = monthlyBasicSalary / STANDARD_DAYS_PER_MONTH
 */
export function calculateDailyRate(monthlyBasicSalary: number): number {
    return monthlyBasicSalary / STANDARD_DAYS_PER_MONTH;
}

/**
 * Calculate basic salary for a period based on actual hours worked.
 * Formula: (Monthly Basic / Standard Hours per Month) * Actual Hours Worked
 */
export function calculateBasicSalaryFromHours(
    monthlyBasicSalary: number,
    actualHoursWorked: number
): number {
    if (actualHoursWorked <= 0 || monthlyBasicSalary <= 0) return 0;
    return Math.round((monthlyBasicSalary / STANDARD_HOURS_PER_MONTH) * actualHoursWorked);
}

/**
 * Calculate overtime pay.
 * Formula: overtimeHours * overtimeRatePerHour
 */
export function calculateOvertimePay(
    overtimeHours: number,
    overtimeRatePerHour: number
): number {
    return Math.round(overtimeHours * overtimeRatePerHour);
}
