import { IncentiveSlab } from "@prisma/client";

export function findMatchingSlab(
    slabs: IncentiveSlab[],
    quantity: number
): IncentiveSlab | null {
    return slabs.find((s) => quantity >= s.qtyFrom && quantity <= s.qtyTo) ?? null;
}

export function calculateLineTotal(quantity: number, ratePerUnit: number): number {
    return Math.round(quantity * ratePerUnit);
}

export function checkSlabOverlap(
    slabs: { qtyFrom: number; qtyTo: number }[],
    newSlab: { qtyFrom: number; qtyTo: number },
    excludeId?: number
): boolean {
    const others = slabs.filter((s: any) => s.id !== excludeId);
    return others.some(
        (s) =>
            newSlab.qtyFrom <= s.qtyTo && newSlab.qtyTo >= s.qtyFrom
    );
}
