import type { SQLiteDatabase } from "expo-sqlite";
import type { Account, Transaction, UserProfile, TransactionType } from "@/src/types/finance";

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
    await db.runAsync("INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, ?, 0, ?)", "Espèces", "cash", currency);
  }
}

export async function listAccounts(db: SQLiteDatabase) {
  return db.getAllAsync<Account>("SELECT id, name, type, balance_minor AS balanceMinor, currency FROM accounts ORDER BY id");
}

export async function listRecentTransactions(db: SQLiteDatabase, limit = 8) {
  return db.getAllAsync<Transaction>("SELECT id, account_id AS accountId, type, amount_minor AS amountMinor, category, note, occurred_at AS occurredAt FROM transactions ORDER BY occurred_at DESC, id DESC LIMIT ?", limit);
}

export async function getMonthTotals(db: SQLiteDatabase, month: string) {
  const row = await db.getFirstAsync<{ income: number; expenses: number }>(
    "SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END), 0) AS income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END), 0) AS expenses FROM transactions WHERE substr(occurred_at, 1, 7) = ?",
    month
  );
  return { income: row?.income ?? 0, expenses: row?.expenses ?? 0 };
}

function localTimestamp() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

export async function createTransaction(
  db: SQLiteDatabase,
  input: { accountId: number; type: Exclude<TransactionType, "transfer">; amountMinor: number; category: string; note?: string }
) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    const account = await txn.getFirstAsync<{ id: number }>("SELECT id FROM accounts WHERE id = ?", input.accountId);
    if (!account) throw new Error("Ce portefeuille n'existe plus.");
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
      input.accountId, input.type, input.amountMinor, input.category, input.note?.trim() || null, localTimestamp()
    );
    const delta = input.type === "income" ? input.amountMinor : -input.amountMinor;
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor + ? WHERE id = ?", delta, input.accountId);
  });
}

export async function transferBetweenAccounts(
  db: SQLiteDatabase,
  input: { fromAccountId: number; toAccountId: number; amountMinor: number; note?: string }
) {
  if (input.fromAccountId === input.toAccountId) throw new Error("Choisis deux portefeuilles différents.");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    const from = await txn.getFirstAsync<{ id: number; currency: string }>("SELECT id, currency FROM accounts WHERE id = ?", input.fromAccountId);
    const to = await txn.getFirstAsync<{ id: number; currency: string }>("SELECT id, currency FROM accounts WHERE id = ?", input.toAccountId);
    if (!from || !to) throw new Error("Un des portefeuilles est introuvable.");
    if (from.currency !== to.currency) throw new Error("Les transferts entre devises différentes ne sont pas encore disponibles.");
    const group = "transfer-" + Date.now().toString() + "-" + Math.random().toString(36).slice(2, 8);
    const date = localTimestamp();
    const note = input.note?.trim() || null;
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at, transfer_group) VALUES (?, 'transfer', ?, 'Transfert sortant', ?, ?, ?)",
      from.id, input.amountMinor, note, date, group
    );
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at, transfer_group) VALUES (?, 'transfer', ?, 'Transfert entrant', ?, ?, ?)",
      to.id, input.amountMinor, note, date, group
    );
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor - ? WHERE id = ?", input.amountMinor, from.id);
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor + ? WHERE id = ?", input.amountMinor, to.id);
  });
}

export function formatMoney(amountMinor: number, currency: string) {
  const fractionDigits = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: fractionDigits }).format(amountMinor / (10 ** fractionDigits));
}

export function amountToMinorUnits(value: string, currency: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!normalized || !Number.isFinite(amount) || amount <= 0) return null;
  const digits = new Intl.NumberFormat("fr-FR", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const factor = 10 ** digits;
  const minor = Math.round(amount * factor);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export async function listBudgets(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<import("@/src/types/finance").Budget>(
    "SELECT b.id, b.category, b.limit_minor AS limitMinor, b.month, COALESCE(SUM(t.amount_minor), 0) AS spentMinor FROM budgets b LEFT JOIN transactions t ON t.category = b.category AND t.type = 'expense' AND substr(t.occurred_at, 1, 7) = b.month WHERE b.month = ? GROUP BY b.id ORDER BY b.category",
    month
  );
}

export async function saveBudget(db: SQLiteDatabase, input: { category: string; limitMinor: number; month: string }) {
  if (!Number.isSafeInteger(input.limitMinor) || input.limitMinor <= 0) throw new Error("Le plafond doit être supérieur à zéro.");
  await db.runAsync(
    "INSERT INTO budgets (category, limit_minor, month) VALUES (?, ?, ?) ON CONFLICT(category, month) DO UPDATE SET limit_minor = excluded.limit_minor",
    input.category, input.limitMinor, input.month
  );
}
