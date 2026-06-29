// Phase 1 catalog of bank account subtypes by bank + account type.
// Used by the onboarding "Add your bank accounts" step.

export const ACCOUNT_TYPES = [
  "Savings",
  "Current",
  "Multi-Currency",
  "Fixed/Term Deposits",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CURRENCIES = ["SGD", "USD", "MYR", "EUR", "GBP", "CNY", "JPY", "Others"] as const;

// Map of bank -> account type -> list of named products in Phase 1.
// Anything not listed here can still be entered via the "Other (specify)" option.
export const BANK_SUBTYPES: Record<string, Partial<Record<AccountType, string[]>>> = {
  "DBS / POSB": {
    Savings: [
      "DBS/POSB My Account (MCA Account)",
      "DBS/POSB Multiplier Account",
      "DBS/POSB eMy Savings Account",
      "DBS/POSB SAYE Account",
      "DBS My Account with Child Account",
      "DBS Child Development Account",
      "DBS Payroll Account",
      "POSB Cashback Bonus Account",
      "POSB Smart Buddy",
      "POSB Save As You Serve (SAYS) Account",
      "POSB Smiley Child Development Account (CDA)",
    ],
    "Fixed/Term Deposits": [
      "DBS/POSB Fixed Deposit Singapore Dollar",
      "DBS/POSB Fixed Deposit Foreign Currency",
    ],
  },
  OCBC: {
    Savings: [
      "OCBC 360 Account",
      "OCBC FRANK Account",
      "OCBC Bonus+ Savings Account",
      "OCBC Monthly Savings Account",
      "Global Savings Account",
      "OCBC MyOwn Account",
      "OCBC Child Development Account (CDA)",
      "OCBC Mighty Savers Account",
      "OCBC Pasbook Savings Account",
      "OCBC Statement Savings Account",
    ],
    Current: ["USD Current Account"],
    "Fixed/Term Deposits": ["OCBC Time Deposit"],
  },
  UOB: {
    Savings: [
      "UOB One Account",
      "Uniplus Account",
      "UOB Stash Account",
      "UOB FX+ Account",
      "UOB Lady's Savings Account",
      "LockAway Account",
      "KrisFlyer UOB Account",
      "Child Development Account (CDA)",
      "Global Currency Account",
      "Global Currency Premium Account",
      "Juniors Savers Account",
      "Passbook Savings Account",
      "Privilege Account",
    ],
    "Fixed/Term Deposits": [
      "Foreign Currency Time/Fixed Deposit Account",
      "Singapore Dollar Time/Fixed Deposit Account",
    ],
  },
  "Standard Chartered": {
    Savings: [
      "Bonus$aver Account",
      "Wealth $aver Account",
      "E$saver Account",
      "USD$aver Account",
      "MyWay Account",
      "First$aver Account",
      "JumpStart Account",
      "SuperSalary Account",
      "E$aver Kids Account",
      "Cheque & Save Account",
      "FCY$aver Account",
    ],
    "Fixed/Term Deposits": [
      "Singapore Dollar Time Deposits",
      "Foreign Currency Time Deposits",
      "Sustainable Time Deposits",
    ],
  },
  Citibank: {
    Savings: [
      "Citi Wealth First Account",
      "Citi Interest Booster Account",
      "Citi MaxiGain Account",
      "MaxiSave Account",
      "Step-Up Interest Account",
      "Tap & Save Account",
      "Global Foreign Currency Account",
      "CitiAccess Account",
      "USD Savings Account",
      "Foreign Currency Account",
      "Checking Account",
      "Savings Account",
      "Citibank Junior Savings Account",
      "Money Market Account",
      "InterestPlus Savings Account",
      "Basic Banking Account",
    ],
    Current: ["USD Checking Account", "USD Interest Checking Account"],
    "Fixed/Term Deposits": ["Citi Time Deposits"],
  },
  HSBC: {
    Savings: [
      "HSBC Everyday Global Account",
      "Singapore Dollar Savings Account",
      "HSBC Premier Account",
      "HSBC Premier Elite Account",
    ],
    Current: ["HSBC Foreign Currency Current Account"],
    "Fixed/Term Deposits": [
      "HSBC Time Deposit Account",
      "HSBC Foreign Currency Time Deposit",
    ],
  },
  Maybank: {
    Savings: [
      "Isavvy Savings Plus Account",
      "Privilege Plus Savings Account",
      "Passbook Savings Account",
      "Saveup Account",
      "Younstarz Account",
      "Isavvy Savings Account",
    ],
    Current: ["Foreign Currency Current Account", "Premierone Current Account"],
    "Fixed/Term Deposits": [
      "Foreign Currency Time Deposit",
      "Isavvy Foreign Currency Time Deposit",
      "ISavvy Time Deposit",
      "Singapore Dollar Privilege Plus Time Deposit",
      "Singapore Dollar Time Deposit",
    ],
  },
  CIMB: {
    Savings: [
      "CIMB FastSaver Account",
      "CIMB FastSaver-i Account",
      "CIMB StarSaver (Savings) Account",
      "CIMB StarSaver (Savings)-i Account",
      "CIMB Hajj Savings-i Account",
      "CIMB Junior Saver Account",
      "CIMB Foreign Currency Savings Account",
    ],
    Current: [
      "CIMB StarSaver Account",
      "CIMB StarSaver-i Account",
      "CIMB Foreign Currency Current Account",
    ],
    "Fixed/Term Deposits": [
      "CIMB SGD Fixed Deposit Account",
      "CIMB Why Wait Fixed Deposit-i Account",
      "CIMB Foreign Currency Fixed Deposit Account",
    ],
  },
  RHB: {
    Savings: ["High Yield Savings Plus Account"],
    Current: [
      "Premier Plus Current Account",
      "Trio Current Account",
      "Foreign Currency Current Account",
    ],
    "Fixed/Term Deposits": ["SGD Fixed Deposit", "Foreign Currency Fixed Deposit"],
  },
  AMEX: {},
  "Trust Bank": {
    Savings: ["Trust Savings Account"],
  },
  DCS: {},
  "Bank of China": {
    Savings: ["BOC SmartSaver", "BOC SuperSaver"],
    "Fixed/Term Deposits": ["EliteSaver - SGD Time Deposit"],
  },
  ICBC: {
    Savings: ["Regular Savings Account Deposit"],
    Current: [
      "Current Account Deposit",
      "Ordinary Current Account",
      "Sync Account",
      "Elite Kids Account",
    ],
    "Fixed/Term Deposits": ["Fixed Deposit"],
  },
  Maribank: {
    Savings: ["Mari Savings Account"],
    "Fixed/Term Deposits": ["Mari Fixed Deposits Account"],
  },
};

export const SG_BANKS = Object.keys(BANK_SUBTYPES);

export const OTHER_SUBTYPE = "Other (specify)";

export function getSubtypeOptions(bank: string, type: AccountType): string[] {
  const subtypes = (BANK_SUBTYPES[bank]?.[type] ?? []).slice();
  subtypes.push(OTHER_SUBTYPE);
  return subtypes;
}