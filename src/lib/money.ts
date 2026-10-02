export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [rupees, fraction = ""] = cleaned.split(".");
  const paise = Number(rupees) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise)) return null;
  return paise;
}

export function invoiceTotals(amounts: number[], taxRate: number) {
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const tax = Math.round((subtotal * taxRate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function parseTaxRate(value: string): number | null {
  if (!/^\d{1,3}$/.test(value.trim())) return null;
  const rate = Number(value);
  if (!Number.isInteger(rate) || rate < 0 || rate > 100) return null;
  return rate;
}

export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
