import type { SQLiteDatabase } from "expo-sqlite";

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1), display_name TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT 'BJ', currency TEXT NOT NULL DEFAULT 'XOF', income_profile TEXT NOT NULL DEFAULT 'regular', onboarding_completed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, balance_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'XOF', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), category TEXT NOT NULL, note TEXT, occurred_at TEXT NOT NULL, transfer_group TEXT, FOREIGN KEY (account_id) REFERENCES accounts(id));
    CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, limit_minor INTEGER NOT NULL CHECK (limit_minor >= 0), month TEXT NOT NULL, UNIQUE(category, month));
    CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, target_minor INTEGER NOT NULL CHECK (target_minor > 0), current_minor INTEGER NOT NULL DEFAULT 0, target_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS recurring_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('income', 'expense')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), category TEXT NOT NULL, frequency TEXT NOT NULL, next_due_at TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  `);
  await db.runAsync("INSERT OR IGNORE INTO profile (id, country, currency, income_profile) VALUES (1, 'BJ', 'XOF', 'regular')");
}
