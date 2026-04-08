export interface PricingOptions {
  totalPages: number;
  copies: number;
  color: string;
  sides: string;
}

// Pricing per page
const COLOR_PRICE = 0.49;      // $0.49 per color page
const BW_PRICE = 0.12;         // $0.12 per B&W page

export function calculatePrice(opts: PricingOptions): number {
  const { totalPages, copies, color, sides } = opts;

  // Two-sided effectively halves the number of physical sheets but same page count
  const pricePerPage = color === "Color" ? COLOR_PRICE : BW_PRICE;
  const totalCost = totalPages * copies * pricePerPage;

  return Math.round(totalCost * 100) / 100; // round to 2 decimal places
}

export function calculatePriceCents(opts: PricingOptions): number {
  return Math.round(calculatePrice(opts) * 100);
}

export function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}

export function getPriceBreakdown(opts: PricingOptions) {
  const { totalPages, copies, color } = opts;
  const pricePerPage = color === "Color" ? COLOR_PRICE : BW_PRICE;
  const total = calculatePrice(opts);

  return {
    pricePerPage,
    totalPages,
    copies,
    total,
  };
}