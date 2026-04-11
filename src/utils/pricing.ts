import type { PricingTier } from "@/integrations/supabase/types";

export function calculatePriceFromTiers(
  quantity: number,
  tiers: PricingTier[]
): number {
  if (!tiers || tiers.length === 0) return 0;

  // Sort tiers by min_quantity ascending
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

  // Find the applicable tier for this quantity
  let unitPrice = sorted[0].unit_price;
  for (const tier of sorted) {
    if (quantity >= tier.min_quantity) {
      unitPrice = tier.unit_price;
    }
  }

  return Math.round(quantity * unitPrice * 100) / 100;
}

export function getApplicableTier(
  quantity: number,
  tiers: PricingTier[]
): PricingTier | null {
  if (!tiers || tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let applicable = sorted[0];
  for (const tier of sorted) {
    if (quantity >= tier.min_quantity) applicable = tier;
  }
  return applicable;
}

export function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export function formatUnitPrice(price: number): string {
  return `$${price.toFixed(4).replace(/\.?0+$/, "")}`;
}
