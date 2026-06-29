// Phase 1 catalog of credit cards by issuing bank and reward type.
// Used by the onboarding "Add your credit cards" step.

export const CARD_TYPES = [
  "Visa",
  "Mastercard",
  "American Express",
  "UnionPay",
  "Others",
] as const;

export type CardType = (typeof CARD_TYPES)[number];

export type CardRewardCategory = "miles" | "cashback";

export const CARD_OTHER = "Other (specify)";

// Map of issuing bank -> reward category -> list of card names in Phase 1.
export const CARDS_BY_BANK: Record<
  string,
  Partial<Record<CardRewardCategory, string[]>>
> = {
  "DBS / POSB": {
    miles: [
      "DBS Altitude Visa Signature Card",
      "DBS Altitude American Express Card",
      "DBS yuu Visa Card",
      "DBS yuu American Express Card",
      "DBS Woman's Mastercard Card",
      "DBS Woman's World Mastercard Card",
      "DBS Vantage Visa Infinite Card",
    ],
    cashback: ["POSB Everyday Card", "DBS Live Fresh Card"],
  },
  OCBC: {
    miles: [
      "OCBC Rewards Card",
      "OCBC 90 N Mastercard Card",
      "OCBC 90 N Visa Card",
      "OCBC VOYAGE Card",
    ],
    cashback: [
      "OCBC INFINITY Cardback Card",
      "OCBC 365 Credit Card",
      "OCBC FRANK Credit Card",
    ],
  },
  UOB: {
    miles: [
      "UOB PRVI Miles Card Visa",
      "UOB PRVI Miles Card Mastercard",
      "UOB PRVI Miles Card American Express",
      "UOB Lady's Credit Card",
      "UOB Lady's Solitaire Card",
      "KrisFlyer UOB Credit Card",
      "UOB Preferred Visa Card",
      "UOB Visa Signature Card",
    ],
    cashback: [
      "UOB One Credit Card",
      "UOB Absolute Cashback Credit Card",
      "UOB EVOL Credit Card",
    ],
  },
  "Standard Chartered": {
    miles: ["SC Visa Infinite Card", "SC Journey Card", "SC Beyond Card"],
    cashback: ["SC Simply Cash Card", "SC Smart Card"],
  },
  Citibank: {
    miles: [
      "Citi PremierMiles World Select Mastercard",
      "Citi Rewards Card",
      "Citi Prestige Card",
    ],
    cashback: ["Citi Cash Back + Card", "Citi Cash Back Card", "Citi SMRT Card"],
  },
  HSBC: {
    miles: [
      "HSBC Premier Mastercard",
      "HSBC Revolution Credit Card",
      "HSBC TravelOne Credit Card",
      "HSBC Visa Infinite Credit Card",
    ],
    cashback: ["HSBC Live+ Credit Card", "HSBC Advance Credit Card"],
  },
  Maybank: {
    miles: [
      "Maybank XL Rewards Card",
      "Maybank Horizon Visa Signature Card",
      "Maybank World Mastercard",
      "Maybank Visa Infinite Card",
    ],
    cashback: [
      "Maybank XL Cashbank Card",
      "Maybank Family & Friends Card",
      "Maybank Platinum Visa Card",
    ],
  },
  AMEX: {
    miles: ["The American Express Singapore Airlines KrisFlyer Credit Card"],
    cashback: ["The American Express True Cashback Card"],
  },
  "Trust Bank": {
    cashback: [
      "Trust Link Credit Card",
      "NTUC Link Credit Card",
      "Trust Cashback Credit Card",
    ],
  },
  Maribank: {
    cashback: ["Mari Credit Card"],
  },
  CIMB: {},
  RHB: {},
  "Bank of China": {},
  ICBC: {},
  DCS: {},
};

export function getCardOptions(bank: string, reward: string): string[] {
  if (!bank) return [];
  const entry = CARDS_BY_BANK[bank];
  if (!entry) return [CARD_OTHER];
  const list: string[] = [];
  if (reward === "miles" || reward === "cashback") {
    list.push(...(entry[reward] ?? []));
  } else {
    // points or any other reward type — show all known cards for the bank
    list.push(...(entry.miles ?? []), ...(entry.cashback ?? []));
  }
  list.push(CARD_OTHER);
  return list;
}

// Format a digit-only string into groups of 4 separated by dashes.
// Supports up to 16 digits (covers 15-digit Amex and 16-digit Visa/MC/UnionPay).
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}