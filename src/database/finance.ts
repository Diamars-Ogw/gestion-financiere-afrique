import type { SQLiteDatabase } from "expo-sqlite";
import type { Account, Transaction, UserProfile } from "@/src/types/finance";

export async function getProfile(db: SQLiteDatabase): Promise<UserProfile | null> {
  return db.getFirstAsync<UserProfile>("SELECT id, display_name AS displayName, country, currency, income_profile AS incomeProfile, onboarding_completed AS onboardingCompleted FROM profile WHERE id = 1");
}

export async function saveProfile(db: SQLiteDatabase, p: Pick<UserProfile, "displayName" | "country" | "currency" | "incomeProfile">) {
  await db.runAsync(
    "UPDATE profile SET display_name = ?, country = ?, currency = ?, income_profile = ?, onboarding_completed = 1 WHERE id = 1",
    p.displayName.trim(), p.country, p.currency, p.incomeProfile
  );
}

export async function ensureDefaultAccount(db: SQLiteDatabase, currency: string) {
  const existing = await db.getFirstAsync<{ id: number }>("SELECT id FROM accounts LIMIT 1");
  if (!existing) {
    await db.runAsync(
      "INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, ?, 0, ?)",
      "Espèces", "cash", currency
    );
  }
}

export async function listAccounts(db: SQLiteDatabase) {
  return db.getAllAsync<Account>("SELECT id, name, type, balance_minor AS balanceMinor, currency FROM accounts ORDER BY id");
}

export async function listRecentTransactions(db: SQLiteDatabase, limit = 8) {
  return db.getAllAsync<Transaction>("SELECT id, account_id AS accountId, type, amount_minor AS amountMinor, category, note, occurred_at AS occurredAt FROM transactions ORDER BY occurred_at DESC LIMIT ?", limit);
}

export async function getMonthTotals(db: SQLiteDatabase, month: string) {
  const row = await db.getFirstAsync<{ income: number; expenses: number }>(
    "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expenses FROM transactions WHERE substr(occurred_at, 1, 7) = ?",
    month
  );
  return { income: row?.income ?? 0, expenses: row?.expenses ?? 0 };
}

export function formatMoney(amountMinor: number, currency: string) {
  const fractionDigits = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: fractionDigits }).format(amountMinor / (10 ** fractionDigits));
}
