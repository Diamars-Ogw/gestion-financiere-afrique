export type IncomeProfile = "regular" | "irregular" | "multiple" | "none";
export type AccountType = "cash" | "bank" | "mobile_money" | "savings" | "other";
export type TransactionType = "income" | "expense" | "transfer";
export interface UserProfile { id: number; country: string; currency: string; incomeProfile: IncomeProfile; displayName: string; onboardingCompleted: boolean; }
export interface Account { id: number; name: string; type: AccountType; balanceMinor: number; currency: string; }
export interface Transaction { id: number; accountId: number; type: TransactionType; amountMinor: number; category: string; note: string | null; occurredAt: string; }
export interface Budget { id: number; category: string; limitMinor: number; spentMinor: number; month: string; }
