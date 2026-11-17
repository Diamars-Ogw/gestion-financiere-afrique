import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

export async function initializeDatabase(db: SQLiteDatabase) {
  if (Platform.OS !== "web") await db.execAsync("PRAGMA journal_mode = WAL;");
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1), display_name TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT 'BJ', currency TEXT NOT NULL DEFAULT 'XOF', income_profile TEXT NOT NULL DEFAULT 'regular', onboarding_completed INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, balance_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'XOF', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), category TEXT NOT NULL, note TEXT, occurred_at TEXT NOT NULL, transfer_group TEXT, FOREIGN KEY (account_id) REFERENCES accounts(id));
    CREATE TABLE IF NOT EXISTS budgets (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, limit_minor INTEGER NOT NULL CHECK (limit_minor >= 0), month TEXT NOT NULL, UNIQUE(category, month));
    CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, target_minor INTEGER NOT NULL CHECK (target_minor > 0), current_minor INTEGER NOT NULL DEFAULT 0, target_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS debts (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, person TEXT NOT NULL DEFAULT '', direction TEXT NOT NULL CHECK (direction IN ('i_owe', 'owed_to_me')), total_minor INTEGER NOT NULL CHECK (total_minor > 0), remaining_minor INTEGER NOT NULL CHECK (remaining_minor >= 0), due_date TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS recurring_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('income', 'expense')), amount_minor INTEGER NOT NULL CHECK (amount_minor > 0), category TEXT NOT NULL, frequency TEXT NOT NULL, next_due_at TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS vehicles (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, kind TEXT NOT NULL, fuel_type TEXT NOT NULL DEFAULT 'unknown', consumption_l_per_100km REAL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS transport_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER, transaction_id INTEGER NOT NULL UNIQUE, kind TEXT NOT NULL, liters_milli INTEGER, odometer_km INTEGER, note TEXT, occurred_at TEXT NOT NULL, FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL, FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS fuel_prices (id INTEGER PRIMARY KEY AUTOINCREMENT, fuel_type TEXT NOT NULL, price_minor INTEGER NOT NULL CHECK (price_minor > 0), effective_date TEXT NOT NULL, UNIQUE(fuel_type, effective_date));
    CREATE TABLE IF NOT EXISTS calendar_events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, amount_minor INTEGER, due_date TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Autre', is_done INTEGER NOT NULL DEFAULT 0, notification_id TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS idx_transport_date ON transport_entries(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_calendar_due ON calendar_events(due_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(occurred_at);
    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  `);
  const calendarColumns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(calendar_events)");
  if (!calendarColumns.some(column => column.name === "notification_id")) await db.execAsync("ALTER TABLE calendar_events ADD COLUMN notification_id TEXT");
  await db.runAsync("INSERT OR IGNORE INTO profile (id, country, currency, income_profile) VALUES (1, 'BJ', 'XOF', 'regular')");
}
