/**
 * Kosha Plus prices as shown in the app. The amounts charged are set in Paddle (one
 * monthly price and one one-time price, each with an India price in rupees); keep the
 * two in step.
 */
export const PLAN_NAME = "Kosha Plus";

export const PRICES = {
  INDIA: { monthly: "₹149", lifetime: "₹2,499" },
  INTERNATIONAL: { monthly: "$4.99", lifetime: "$79" },
} as const;

export type PlanChoice = "monthly" | "lifetime";
