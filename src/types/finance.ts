export type IncomeProfile = "regular" | "irregular" | "multiple" | "none";
export type AccountType = "cash" | "bank" | "mobile_money" | "savings" | "other";
export type TransactionType = "income" | "expense" | "transfer";
export interface UserProfile { id: number; country: string; currency: string; incomeProfile: IncomeProfile; displayName: string; onboardingCompleted: boolean; }
export interface Account { id: number; name: string; type: AccountType; balanceMinor: number; currency: string; }
export interface Transaction { id: number; accountId: number; type: TransactionType; amountMinor: number; category: string; note: string | null; occurredAt: string; }
export interface Budget { id: number; category: string; limitMinor: number; spentMinor: number; month: string; }

export interface SavingsGoal { id: number; name: string; targetMinor: number; currentMinor: number; targetDate: string | null; }

export type DebtDirection = "i_owe" | "owed_to_me";
export interface Debt { id: number; label: string; person: string; direction: DebtDirection; totalMinor: number; remainingMinor: number; dueDate: string | null; }

export type RecurringFrequency = "weekly" | "monthly" | "yearly";
export interface RecurringRule { id: number; label: string; type: "income" | "expense"; amountMinor: number; category: string; frequency: RecurringFrequency; nextDueAt: string; isActive: number; }

export type VehicleKind = "motorcycle" | "car" | "other";
export type TransportKind = "fuel" | "maintenance" | "public_transport" | "taxi" | "other";
export interface Vehicle { id: number; name: string; kind: VehicleKind; fuelType: string; consumptionLPer100Km: number | null; }
export interface TransportEntry { id: number; vehicleId: number | null; transactionId: number; kind: TransportKind; litersMilli: number | null; odometerKm: number | null; note: string | null; occurredAt: string; amountMinor: number; }
export interface CalendarEvent { id: number; title: string; amountMinor: number | null; dueDate: string; category: string; isDone: number; }
