import { SQLocal } from 'sqlocal';

// Initialize the SQLocal instance which creates a Web Worker and OPFS file
export const sqlocal = new SQLocal('grocery_store_v1.sqlite3');

export interface BaseRecord {
    id?: number;
    is_active: number;          // 1 = active, 0 = soft delete
    created_at: number;         // Unix ms
    updated_at: number;
    created_by: string;
    updated_by: string;
    sync_status?: 'pending' | 'synced' | 'failed';
}

// ─────────────────────────────────────────────────────────────
// Events for Reactivity
// ─────────────────────────────────────────────────────────────
type Listener = () => void;
class DBEventEmitter {
    private listeners: Set<Listener> = new Set();

    subscribe(listener: Listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit() {
        this.listeners.forEach(l => l());
    }
}

export const dbEvents = new DBEventEmitter();

// Call this after any mutation (INSERT, UPDATE, DELETE) to trigger React re-renders
export function triggerDBUpdate() {
    dbEvents.emit();
}

// ─────────────────────────────────────────────────────────────
// Schema Initialization
// ─────────────────────────────────────────────────────────────
export async function initDB() {
    await sqlocal.sql`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_name TEXT NOT NULL,
      store_owner TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      pin TEXT NOT NULL,
      logo_letter TEXT NOT NULL,
      theme_color TEXT NOT NULL,
      is_setup_complete INTEGER NOT NULL,
      last_backup INTEGER,
      recovery_key TEXT
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      customer_name TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      sync_status TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      unit TEXT,
      quantity REAL NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES sales(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_name TEXT NOT NULL,
      invoice_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      extra_costs_transport REAL,
      extra_costs_loading REAL,
      extra_costs_misc REAL,
      grand_total REAL,
      payment_mode TEXT NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      sync_status TEXT
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      category TEXT,
      unit TEXT,
      quantity REAL NOT NULL,
      purchase_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY(purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS khata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone_number TEXT NOT NULL,
      total_credit REAL NOT NULL,
      pending_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      sync_status TEXT
    );

    CREATE TABLE IF NOT EXISTS khata_payments (
      id TEXT PRIMARY KEY,
      khata_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid_at INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY(khata_id) REFERENCES khata(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      sync_status TEXT
    );
  `;
}
