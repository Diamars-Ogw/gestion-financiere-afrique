import type { SQLiteDatabase } from "expo-sqlite";
import type { Account, Transaction, UserProfile, TransactionType } from "@/src/types/finance";
import { amountToMinorUnits, formatMoney } from "@/src/utils/money";
import { isValidDateOnly } from "@/src/utils/date";
export { amountToMinorUnits, formatMoney } from "@/src/utils/money";

export async function getProfile(db: SQLiteDatabase): Promise<UserProfile | null> {
  return db.getFirstAsync<UserProfile>("SELECT id, display_name AS displayName, country, currency, income_profile AS incomeProfile, onboarding_completed AS onboardingCompleted FROM profile WHERE id = 1");
}

export async function saveProfile(db: SQLiteDatabase, p: Pick<UserProfile, "displayName" | "country" | "currency" | "incomeProfile">) {
  await db.runAsync(
    "UPDATE profile SET display_name = ?, country = ?, currency = ?, income_profile = ?, onboarding_completed = 1 WHERE id = 1",
    p.displayName.trim(), p.country, p.currency, p.incomeProfile
  );
}

export async function ensureDefaultAccount(db: SQLiteDatabase, currency: string, openingBalanceMinor = 0, accountType: import("@/src/types/finance").AccountType = "cash", accountName?: string) {
  const existing = await db.getFirstAsync<{ id: number }>("SELECT id FROM accounts LIMIT 1");
  if (!existing) {
    if (!Number.isSafeInteger(openingBalanceMinor) || openingBalanceMinor < 0) throw new Error("Solde initial invalide.");
    const defaultName = accountName?.trim() || (accountType === "mobile_money" ? "Mobile Money" : accountType === "bank" ? "Banque" : "Espèces");
    await db.runAsync("INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, ?, ?, ?)", defaultName, accountType, openingBalanceMinor, currency);
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
    const account = await txn.getFirstAsync<{ id: number; balanceMinor: number }>("SELECT id, balance_minor AS balanceMinor FROM accounts WHERE id = ?", input.accountId);
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
    const from = await txn.getFirstAsync<{ id: number; currency: string; balanceMinor: number }>("SELECT id, currency, balance_minor AS balanceMinor FROM accounts WHERE id = ?", input.fromAccountId);
    const to = await txn.getFirstAsync<{ id: number; currency: string }>("SELECT id, currency FROM accounts WHERE id = ?", input.toAccountId);
    if (!from || !to) throw new Error("Un des portefeuilles est introuvable.");
    if (from.currency !== to.currency) throw new Error("Les transferts entre devises différentes ne sont pas encore disponibles.");
    if (from.balanceMinor < input.amountMinor) throw new Error("Le solde du portefeuille source est insuffisant.");
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
  if (input.targetDate && !isValidDateOnly(input.targetDate)) throw new Error("Date cible invalide.");
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
    const activity = await db.getFirstAsync<{ transactions: number; nonZeroAccounts: number; budgets: number; goals: number; debts: number; recurring: number; calendarAmounts: number; fuelPrices: number }>(
      "SELECT (SELECT COUNT(*) FROM transactions) AS transactions, (SELECT COUNT(*) FROM accounts WHERE balance_minor != 0) AS nonZeroAccounts, (SELECT COUNT(*) FROM budgets) AS budgets, (SELECT COUNT(*) FROM goals) AS goals, (SELECT COUNT(*) FROM debts) AS debts, (SELECT COUNT(*) FROM recurring_rules) AS recurring, (SELECT COUNT(*) FROM calendar_events WHERE amount_minor IS NOT NULL) AS calendarAmounts, (SELECT COUNT(*) FROM fuel_prices) AS fuelPrices"
    );
    if (activity && Object.values(activity).some(value => value > 0)) {
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

export async function createAccount(db: SQLiteDatabase, input: { name: string; type: import("@/src/types/finance").AccountType; currency: string; openingBalanceMinor?: number }) {
  const name = input.name.trim();
  if (!name) throw new Error("Donne un nom au portefeuille.");
  const opening = input.openingBalanceMinor ?? 0;
  if (!Number.isSafeInteger(opening) || opening < 0) throw new Error("Solde initial invalide.");
  await db.runAsync("INSERT INTO accounts (name, type, balance_minor, currency) VALUES (?, ?, ?, ?)", name, input.type, opening, input.currency);
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
  if (input.dueDate && !isValidDateOnly(input.dueDate)) throw new Error("Date d’échéance invalide.");
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
  if (input.type !== "income" && input.type !== "expense") throw new Error("Type d’échéance invalide.");
  if (!["weekly", "monthly", "yearly"].includes(input.frequency)) throw new Error("Fréquence invalide.");
  if (!isValidDateOnly(input.nextDueAt)) throw new Error("La date doit être une date réelle au format AAAA-MM-JJ.");
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


export async function listVehicles(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").Vehicle>("SELECT id, name, kind, fuel_type AS fuelType, consumption_l_per_100km AS consumptionLPer100Km FROM vehicles ORDER BY id DESC");
}
export async function createVehicle(db: SQLiteDatabase, input: { name: string; kind: import("@/src/types/finance").VehicleKind; fuelType: string; consumption?: number | null }) {
  if (!input.name.trim()) throw new Error("Donne un nom au véhicule.");
  if (input.consumption != null && (!Number.isFinite(input.consumption) || input.consumption <= 0 || input.consumption > 100)) throw new Error("Consommation invalide.");
  await db.runAsync("INSERT INTO vehicles (name, kind, fuel_type, consumption_l_per_100km) VALUES (?, ?, ?, ?)", input.name.trim(), input.kind, input.fuelType.trim() || "unknown", input.consumption ?? null);
}
export async function listTransportEntries(db: SQLiteDatabase, limit = 30) {
  return db.getAllAsync<import("@/src/types/finance").TransportEntry>("SELECT e.id, e.vehicle_id AS vehicleId, e.transaction_id AS transactionId, e.kind, e.liters_milli AS litersMilli, e.odometer_km AS odometerKm, e.note, e.occurred_at AS occurredAt, t.amount_minor AS amountMinor FROM transport_entries e JOIN transactions t ON t.id = e.transaction_id ORDER BY e.occurred_at DESC LIMIT ?", limit);
}
export async function recordTransportExpense(db: SQLiteDatabase, input: { accountId: number; amountMinor: number; kind: import("@/src/types/finance").TransportKind; vehicleId?: number | null; liters?: number | null; odometerKm?: number | null; note?: string }) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error("Montant invalide.");
  if (input.kind === "fuel" && (input.liters == null || !Number.isFinite(input.liters) || input.liters <= 0)) throw new Error("Indique la quantité de carburant achetée.");
  if (input.odometerKm != null && (!Number.isSafeInteger(input.odometerKm) || input.odometerKm < 0)) throw new Error("Kilométrage invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    const account = await txn.getFirstAsync<{id:number; balanceMinor:number}>("SELECT id, balance_minor AS balanceMinor FROM accounts WHERE id=?",input.accountId);
    if (!account) throw new Error("Portefeuille introuvable.");
    if (account.balanceMinor < input.amountMinor) throw new Error("Solde insuffisant. Mets à jour ton solde de départ ou choisis un autre portefeuille.");
    if (input.vehicleId != null && !await txn.getFirstAsync("SELECT id FROM vehicles WHERE id=?",input.vehicleId)) throw new Error("Véhicule introuvable.");
    const timestamp=localTimestamp();
    const result=await txn.runAsync("INSERT INTO transactions (account_id,type,amount_minor,category,note,occurred_at) VALUES (?,'expense',?,'Transport',?,?)",account.id,input.amountMinor,input.note?.trim()||"Dépense de transport",timestamp);
    await txn.runAsync("UPDATE accounts SET balance_minor=balance_minor-? WHERE id=?",input.amountMinor,account.id);
    await txn.runAsync("INSERT INTO transport_entries (vehicle_id,transaction_id,kind,liters_milli,odometer_km,note,occurred_at) VALUES (?,?,?,?,?,?,?)",input.vehicleId??null,Number(result.lastInsertRowId),input.kind,input.liters==null?null:Math.round(input.liters*1000),input.odometerKm??null,input.note?.trim()||null,timestamp);
  });
}

export async function listFuelPrices(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").FuelPrice>("SELECT id, fuel_type AS fuelType, price_minor AS priceMinor, effective_date AS effectiveDate FROM fuel_prices ORDER BY effective_date DESC, fuel_type");
}
export async function saveFuelPrice(db: SQLiteDatabase,input:{fuelType:string;priceMinor:number;effectiveDate:string}) {
  if(!input.fuelType.trim()) throw new Error("Indique le type de carburant.");
  if(!Number.isSafeInteger(input.priceMinor)||input.priceMinor<=0) throw new Error("Prix au litre invalide.");
  if(!isValidDateOnly(input.effectiveDate)) throw new Error("Date invalide.");
  await db.runAsync("INSERT INTO fuel_prices (fuel_type,price_minor,effective_date) VALUES (?,?,?) ON CONFLICT(fuel_type,effective_date) DO UPDATE SET price_minor=excluded.price_minor",input.fuelType.trim(),input.priceMinor,input.effectiveDate);
}
export async function listCalendarEvents(db: SQLiteDatabase) {
  return db.getAllAsync<import("@/src/types/finance").CalendarEvent>("SELECT id,title,amount_minor AS amountMinor,due_date AS dueDate,category,is_done AS isDone,notification_id AS notificationId FROM calendar_events ORDER BY is_done ASC,due_date ASC");
}
export async function createCalendarEvent(db: SQLiteDatabase,input:{title:string;amountMinor?:number|null;dueDate:string;category:string}) {
  if(!input.title.trim()) throw new Error("Donne un titre à cette échéance.");
  if(!isValidDateOnly(input.dueDate)) throw new Error("Date invalide.");
  if(input.amountMinor!=null&&(!Number.isSafeInteger(input.amountMinor)||input.amountMinor<=0)) throw new Error("Montant invalide.");
  const result = await db.runAsync("INSERT INTO calendar_events (title,amount_minor,due_date,category) VALUES (?,?,?,?)",input.title.trim(),input.amountMinor??null,input.dueDate,input.category.trim()||"Autre");
  return Number(result.lastInsertRowId);
}
export async function setCalendarNotificationId(db: SQLiteDatabase,eventId:number,notificationId:string|null) {
  await db.runAsync("UPDATE calendar_events SET notification_id=? WHERE id=?",notificationId,eventId);
}
export async function toggleCalendarEvent(db: SQLiteDatabase,eventId:number,done:boolean) {
  await db.runAsync("UPDATE calendar_events SET is_done=? WHERE id=?",done?1:0,eventId);
}

export async function createBackupData(db: SQLiteDatabase) {
  const [profile, accounts, transactions, budgets, goals, recurringRules, debts, vehicles, transportEntries, calendarEvents, fuelPrices] = await Promise.all([
    db.getAllAsync("SELECT * FROM profile"),
    db.getAllAsync("SELECT * FROM accounts ORDER BY id"),
    db.getAllAsync("SELECT * FROM transactions ORDER BY id"),
    db.getAllAsync("SELECT * FROM budgets ORDER BY id"),
    db.getAllAsync("SELECT * FROM goals ORDER BY id"),
    db.getAllAsync("SELECT * FROM recurring_rules ORDER BY id"),
    db.getAllAsync("SELECT * FROM debts ORDER BY id"),
    db.getAllAsync("SELECT * FROM vehicles ORDER BY id"),
    db.getAllAsync("SELECT * FROM transport_entries ORDER BY id"),
    db.getAllAsync("SELECT id,title,amount_minor,due_date,category,is_done,created_at FROM calendar_events ORDER BY id"),
    db.getAllAsync("SELECT * FROM fuel_prices ORDER BY id")
  ]);
  return {
    app: "Mon Équilibre",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { profile, accounts, transactions, budgets, goals, recurringRules, debts, vehicles, transportEntries, calendarEvents, fuelPrices }
  };
}

export async function restoreBackupData(db: SQLiteDatabase, backup: any) {
  if (!backup || backup.app !== "Mon Équilibre" || backup.schemaVersion !== 1 || !backup.data) {
    throw new Error("Ce fichier n'est pas une sauvegarde Mon Équilibre reconnue.");
  }
  const data = backup.data;
  const required = ["profile", "accounts", "transactions", "budgets", "goals", "recurringRules", "debts"];
  for (const key of ["vehicles", "transportEntries", "calendarEvents", "fuelPrices"]) if (data[key] === undefined) data[key] = [];
  for (const key of required) {
    if (!Array.isArray(data[key])) throw new Error("La sauvegarde est incomplète : " + key + ".");
  }
  if (data.profile.length !== 1 || data.profile[0].id !== 1) throw new Error("Le profil de la sauvegarde est invalide.");
  await db.withExclusiveTransactionAsync(async txn => {
    await txn.runAsync("DELETE FROM transport_entries");
    await txn.runAsync("DELETE FROM calendar_events");
    await txn.runAsync("DELETE FROM fuel_prices");
    await txn.runAsync("DELETE FROM vehicles");
    await txn.runAsync("DELETE FROM transactions");
    await txn.runAsync("DELETE FROM budgets");
    await txn.runAsync("DELETE FROM goals");
    await txn.runAsync("DELETE FROM recurring_rules");
    await txn.runAsync("DELETE FROM debts");
    await txn.runAsync("DELETE FROM accounts");
    await txn.runAsync("DELETE FROM profile");
    const p = data.profile[0];
    await txn.runAsync(
      "INSERT INTO profile (id, display_name, country, currency, income_profile, onboarding_completed) VALUES (1, ?, ?, ?, ?, ?)",
      p.display_name, p.country, p.currency, p.income_profile, p.onboarding_completed
    );
    for (const a of data.accounts) {
      await txn.runAsync(
        "INSERT INTO accounts (id, name, type, balance_minor, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        a.id, a.name, a.type, a.balance_minor, a.currency, a.created_at
      );
    }
    for (const t of data.transactions) {
      await txn.runAsync(
        "INSERT INTO transactions (id, account_id, type, amount_minor, category, note, occurred_at, transfer_group) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        t.id, t.account_id, t.type, t.amount_minor, t.category, t.note, t.occurred_at, t.transfer_group
      );
    }
    for (const b of data.budgets) {
      await txn.runAsync("INSERT INTO budgets (id, category, limit_minor, month) VALUES (?, ?, ?, ?)", b.id, b.category, b.limit_minor, b.month);
    }
    for (const g of data.goals) {
      await txn.runAsync("INSERT INTO goals (id, name, target_minor, current_minor, target_date, created_at) VALUES (?, ?, ?, ?, ?, ?)", g.id, g.name, g.target_minor, g.current_minor, g.target_date, g.created_at);
    }
    for (const r of data.recurringRules) {
      await txn.runAsync("INSERT INTO recurring_rules (id, label, type, amount_minor, category, frequency, next_due_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", r.id, r.label, r.type, r.amount_minor, r.category, r.frequency, r.next_due_at, r.is_active);
    }
    for (const d of data.debts) {
      await txn.runAsync("INSERT INTO debts (id, label, person, direction, total_minor, remaining_minor, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", d.id, d.label, d.person, d.direction, d.total_minor, d.remaining_minor, d.due_date, d.created_at);
    }
    for (const v of data.vehicles) await txn.runAsync("INSERT INTO vehicles (id,name,kind,fuel_type,consumption_l_per_100km,created_at) VALUES (?,?,?,?,?,?)",v.id,v.name,v.kind,v.fuel_type,v.consumption_l_per_100km,v.created_at);
    for (const e of data.transportEntries) await txn.runAsync("INSERT INTO transport_entries (id,vehicle_id,transaction_id,kind,liters_milli,odometer_km,note,occurred_at) VALUES (?,?,?,?,?,?,?,?)",e.id,e.vehicle_id,e.transaction_id,e.kind,e.liters_milli,e.odometer_km,e.note,e.occurred_at);
    for (const e of data.calendarEvents) await txn.runAsync("INSERT INTO calendar_events (id,title,amount_minor,due_date,category,is_done,notification_id,created_at) VALUES (?,?,?,?,?,?,?,?)",e.id,e.title,e.amount_minor,e.due_date,e.category,e.is_done,null,e.created_at);
    for (const p of data.fuelPrices) await txn.runAsync("INSERT INTO fuel_prices (id,fuel_type,price_minor,effective_date) VALUES (?,?,?,?)",p.id,p.fuel_type,p.price_minor,p.effective_date);
  });
}
