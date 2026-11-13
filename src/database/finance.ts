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

export async function listGoals(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").SavingsGoal>(
    "SELECT id, name, target_minor AS targetMinor, current_minor AS currentMinor, target_date AS targetDate FROM goals ORDER BY id DESC"
  );
}

export async function createGoal(db: SQLiteDatabase, input: { name: string; targetMinor: number; targetDate?: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Donne un nom à cet objectif.");
  if (!Number.isSafeInteger(input.targetMinor) || input.targetMinor <= 0) throw new Error("Le montant cible doit être supérieur à zéro.");
  await db.runAsync("INSERT INTO goals (name, target_minor, target_date) VALUES (?, ?, ?)", name, input.targetMinor, input.targetDate || null);
}

export async function contributeToGoal(db: SQLiteDatabase, input: { goalId: number; accountId: number; amountMinor: number }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    const goal = await txn.getFirstAsync<{ id: number; name: string; targetMinor: number }>(
      "SELECT id, name, target_minor AS targetMinor FROM goals WHERE id = ?", input.goalId
    );
    const source = await txn.getFirstAsync<{ id: number; currency: string; balanceMinor: number }>(
      "SELECT id, currency, balance_minor AS balanceMinor FROM accounts WHERE id = ?", input.accountId
    );
    if (!goal || !source) throw new Error("L'objectif ou le portefeuille est introuvable.");
    if (source.balanceMinor < input.amountMinor) throw new Error("Le solde du portefeuille est insuffisant.");
    let savings = await txn.getFirstAsync<{ id: number; currency: string }>(
      "SELECT id, currency FROM accounts WHERE type = 'savings' AND currency = ? ORDER BY id LIMIT 1", source.currency
    );
    if (!savings) {
      const created = await txn.runAsync(
        "INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, 'savings', 0, ?)",
        "Épargne", source.currency
      );
      savings = { id: Number(created.lastInsertRowId), currency: source.currency };
    }
    if (savings.id === source.id) throw new Error("Choisis un portefeuille différent du compte épargne.");
    const group = "goal-" + goal.id + "-" + Date.now().toString();
    const date = localTimestamp();
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at, transfer_group) VALUES (?, 'transfer', ?, ?, ?, ?, ?)",
      source.id, input.amountMinor, "Épargne vers " + goal.name, "Versement objectif", date, group
    );
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at, transfer_group) VALUES (?, 'transfer', ?, ?, ?, ?, ?)",
      savings.id, input.amountMinor, "Épargne reçue pour " + goal.name, "Versement objectif", date, group
    );
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor - ? WHERE id = ?", input.amountMinor, source.id);
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor + ? WHERE id = ?", input.amountMinor, savings.id);
    await txn.runAsync("UPDATE goals SET current_minor = current_minor + ? WHERE id = ?", input.amountMinor, goal.id);
  });
}

export async function updateProfileSettings(
  db: SQLiteDatabase,
  input: { displayName: string; country: string; currency: string; incomeProfile: import("@/src/types/finance").IncomeProfile }
) {
  const current = await db.getFirstAsync<{ currency: string }>("SELECT currency FROM profile WHERE id = 1");
  if (current && current.currency !== input.currency) {
    const activity = await db.getFirstAsync<{ transactions: number; nonZeroAccounts: number }>(
      "SELECT (SELECT COUNT(*) FROM transactions) AS transactions, (SELECT COUNT(*) FROM accounts WHERE balance_minor != 0) AS nonZeroAccounts"
    );
    if ((activity?.transactions ?? 0) > 0 || (activity?.nonZeroAccounts ?? 0) > 0) {
      throw new Error("Tu as déjà des opérations ou des soldes dans " + current.currency + ". Pour éviter de mélanger deux devises, termine d'abord une sauvegarde et une conversion sécurisée de tes soldes.");
    }
  }
  await db.withExclusiveTransactionAsync(async txn => {
    await txn.runAsync(
      "UPDATE profile SET display_name = ?, country = ?, currency = ?, income_profile = ? WHERE id = 1",
      input.displayName.trim(), input.country, input.currency, input.incomeProfile
    );
    await txn.runAsync("UPDATE accounts SET currency = ? WHERE balance_minor = 0", input.currency);
  });
}

export async function createAccount(db: SQLiteDatabase, input: { name: string; type: import("@/src/types/finance").AccountType; currency: string }) {
  const name = input.name.trim();
  if (!name) throw new Error("Donne un nom au portefeuille.");
  await db.runAsync("INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, ?, 0, ?)", name, input.type, input.currency);
}

export async function deleteEmptyAccount(db: SQLiteDatabase, accountId: number) {
  const account = await db.getFirstAsync<{ balanceMinor: number }>(
    "SELECT balance_minor AS balanceMinor FROM accounts WHERE id = ?", accountId
  );
  if (!account) return;
  if (account.balanceMinor !== 0) throw new Error("Ce portefeuille a un solde. Transfère d'abord son argent.");
  const tx = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM transactions WHERE account_id = ?", accountId);
  if ((tx?.count ?? 0) > 0) throw new Error("Ce portefeuille possède un historique et ne peut pas être supprimé.");
  await db.runAsync("DELETE FROM accounts WHERE id = ?", accountId);
}

export async function listDebts(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").Debt>(
    "SELECT id, label, person, direction, total_minor AS totalMinor, remaining_minor AS remainingMinor, due_date AS dueDate FROM debts ORDER BY CASE WHEN remaining_minor > 0 THEN 0 ELSE 1 END, id DESC"
  );
}

export async function createDebt(db: SQLiteDatabase, input: { label: string; person?: string; direction: import("@/src/types/finance").DebtDirection; amountMinor: number; dueDate?: string }) {
  if (!input.label.trim()) throw new Error("Donne un intitulé à cette dette.");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  await db.runAsync(
    "INSERT INTO debts (label, person, direction, total_minor, remaining_minor, due_date) VALUES (?, ?, ?, ?, ?, ?)",
    input.label.trim(), input.person?.trim() || "", input.direction, input.amountMinor, input.amountMinor, input.dueDate || null
  );
}

export async function recordDebtPayment(db: SQLiteDatabase, input: { debtId: number; accountId: number; amountMinor: number }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    const debt = await txn.getFirstAsync<{ id: number; label: string; direction: string; remainingMinor: number }>(
      "SELECT id, label, direction, remaining_minor AS remainingMinor FROM debts WHERE id = ?", input.debtId
    );
    const account = await txn.getFirstAsync<{ id: number; currency: string; balanceMinor: number }>(
      "SELECT id, currency, balance_minor AS balanceMinor FROM accounts WHERE id = ?", input.accountId
    );
    if (!debt || !account) throw new Error("La dette ou le portefeuille est introuvable.");
    if (input.amountMinor > debt.remainingMinor) throw new Error("Le paiement dépasse le montant restant.");
    const outgoing = debt.direction === "i_owe";
    if (outgoing && account.balanceMinor < input.amountMinor) throw new Error("Le solde du portefeuille est insuffisant.");
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
      account.id, outgoing ? "expense" : "income", input.amountMinor,
      outgoing ? "Remboursement de dette" : "Remboursement reçu",
      debt.label, localTimestamp()
    );
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor + ? WHERE id = ?", outgoing ? -input.amountMinor : input.amountMinor, account.id);
    await txn.runAsync("UPDATE debts SET remaining_minor = remaining_minor - ? WHERE id = ?", input.amountMinor, debt.id);
  });
}

export async function listRecurringRules(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").RecurringRule>(
    "SELECT id, label, type, amount_minor AS amountMinor, category, frequency, next_due_at AS nextDueAt, is_active AS isActive FROM recurring_rules ORDER BY is_active DESC, next_due_at ASC"
  );
}

export async function createRecurringRule(db: SQLiteDatabase, input: { label: string; type: "income" | "expense"; amountMinor: number; category: string; frequency: import("@/src/types/finance").RecurringFrequency; nextDueAt: string }) {
  if (!input.label.trim()) throw new Error("Donne un nom à cette échéance.");
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextDueAt)) throw new Error("La date doit être au format AAAA-MM-JJ.");
  await db.runAsync(
    "INSERT INTO recurring_rules (label, type, amount_minor, category, frequency, next_due_at, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)",
    input.label.trim(), input.type, input.amountMinor, input.category, input.frequency, input.nextDueAt
  );
}

function advanceDueDate(dateValue: string, frequency: string) {
  const parts = dateValue.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (frequency === "weekly") date.setDate(date.getDate() + 7);
  else if (frequency === "yearly") date.setFullYear(date.getFullYear() + 1);
  else {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

export async function markRecurringRulePaid(db: SQLiteDatabase, input: { ruleId: number; accountId: number }) {
  await db.withExclusiveTransactionAsync(async txn => {
    const rule = await txn.getFirstAsync<{ id: number; label: string; type: string; amountMinor: number; category: string; frequency: string; nextDueAt: string; isActive: number }>(
      "SELECT id, label, type, amount_minor AS amountMinor, category, frequency, next_due_at AS nextDueAt, is_active AS isActive FROM recurring_rules WHERE id = ?", input.ruleId
    );
    const account = await txn.getFirstAsync<{ id: number; balanceMinor: number }>(
      "SELECT id, balance_minor AS balanceMinor FROM accounts WHERE id = ?", input.accountId
    );
    if (!rule || !rule.isActive || !account) throw new Error("Cette échéance ou ce portefeuille n'est plus disponible.");
    if (rule.type === "expense" && account.balanceMinor < rule.amountMinor) throw new Error("Le solde du portefeuille est insuffisant.");
    await txn.runAsync(
      "INSERT INTO transactions (account_id, type, amount_minor, category, note, occurred_at) VALUES (?, ?, ?, ?, ?, ?)",
      account.id, rule.type, rule.amountMinor, rule.category, rule.label, localTimestamp()
    );
    await txn.runAsync("UPDATE accounts SET balance_minor = balance_minor + ? WHERE id = ?", rule.type === "income" ? rule.amountMinor : -rule.amountMinor, account.id);
    await txn.runAsync("UPDATE recurring_rules SET next_due_at = ? WHERE id = ?", advanceDueDate(rule.nextDueAt, rule.frequency), rule.id);
  });
}

export async function toggleRecurringRule(db: SQLiteDatabase, ruleId: number, active: boolean) {
  await db.runAsync("UPDATE recurring_rules SET is_active = ? WHERE id = ?", active ? 1 : 0, ruleId);
}

export async function getMonthlyHistory(db: SQLiteDatabase, months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const startKey = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0");
  const rows = await db.getAllAsync<{ month: string; income: number; expenses: number }>(
    "SELECT substr(occurred_at, 1, 7) AS month, SUM(CASE WHEN type = 'income' THEN amount_minor ELSE 0 END) AS income, SUM(CASE WHEN type = 'expense' THEN amount_minor ELSE 0 END) AS expenses FROM transactions WHERE substr(occurred_at, 1, 7) >= ? GROUP BY substr(occurred_at, 1, 7) ORDER BY month",
    startKey
  );
  const map = new Map(rows.map(x => [x.month, x]));
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    const row = map.get(key);
    return { month: key, income: row?.income ?? 0, expenses: row?.expenses ?? 0 };
  });
}

export async function getExpenseCategories(db: SQLiteDatabase, month: string) {
  return db.getAllAsync<{ category: string; amountMinor: number }>(
    "SELECT category, SUM(amount_minor) AS amountMinor FROM transactions WHERE type = 'expense' AND substr(occurred_at, 1, 7) = ? GROUP BY category ORDER BY amountMinor DESC",
    month
  );
}
