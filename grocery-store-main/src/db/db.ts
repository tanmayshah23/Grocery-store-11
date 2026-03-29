import { sqlocal, triggerDBUpdate, BaseRecord } from './sqlite';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface SaleItem {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    unit?: string;
    quantity: number;
    price: number;
    total: number;
}

export interface Sale extends BaseRecord {
    bill_number: string;
    items: SaleItem[];
    total_amount: number;
    payment_mode: 'cash' | 'upi' | 'online' | 'mixed';
    customer_name?: string;
}

export interface PurchaseItem {
    id: string;
    name: string;
    brand?: string;
    category?: string;
    unit?: string;
    quantity: number;
    purchase_price: number;
    total: number;
}

export interface PurchaseExtraCosts {
    transport?: number;
    loading?: number;
    misc?: number;
}

export interface Purchase extends BaseRecord {
    supplier_name: string;
    invoice_number: string;
    items: PurchaseItem[];
    total_amount: number;
    extra_costs?: PurchaseExtraCosts;
    grand_total?: number;
    payment_mode: 'cash' | 'upi' | 'online' | 'credit';
    notes?: string;
}

export interface KhataPayment {
    id: string;
    amount: number;
    paid_at: number;
    note?: string;
}

export interface Khata extends BaseRecord {
    customer_name: string;
    phone_number: string;
    total_credit: number;
    pending_amount: number;
    paid_amount: number;
    payment_history: KhataPayment[];
    notes?: string;
}

export type ExpenseCategory =
    | 'rent'
    | 'electricity'
    | 'water'
    | 'internet'
    | 'transport'
    | 'staff'
    | 'misc';

export interface Expense extends BaseRecord {
    category: ExpenseCategory;
    amount: number;
    notes?: string;
}

export interface Settings {
    id?: number;
    store_name: string;
    store_owner: string;
    email: string;
    phone: string;
    pin: string;
    logo_letter: string;
    theme_color: string;
    is_setup_complete: boolean;
    last_backup?: number;
    recovery_key?: string;
    store_address?: string;
}

// ─────────────────────────────────────────────────────────────
// DAO (Data Access Object) Methods
// ─────────────────────────────────────────────────────────────

export const db = {
    settings: {
        async toCollection() {
            return {
                async first(): Promise<Settings | undefined> {
                    const res = await sqlocal.sql`SELECT * FROM settings LIMIT 1`;
                    if (res.length === 0) return undefined;
                    const row = res[0] as any;
                    return { ...row, is_setup_complete: Boolean(row.is_setup_complete) };
                }
            }
        },
        async add(settings: Settings) {
            await sqlocal.sql`
        INSERT INTO settings (
          store_name, store_owner, email, phone, pin, logo_letter, theme_color, is_setup_complete, last_backup, recovery_key
        ) VALUES (
          ${settings.store_name}, ${settings.store_owner}, ${settings.email}, ${settings.phone}, ${settings.pin},
          ${settings.logo_letter}, ${settings.theme_color}, ${settings.is_setup_complete ? 1 : 0}, ${settings.last_backup || null}, ${settings.recovery_key || null}
        )
      `;
            triggerDBUpdate();
        },
        async update(id: number, data: Partial<Settings>) {
            const sets: string[] = [];
            const values: any[] = [];
            for (const [key, value] of Object.entries(data)) {
                sets.push(`${key} = ?`);
                values.push(value);
            }
            values.push(id);

            const stmt = `UPDATE settings SET ${sets.join(', ')} WHERE id = ?`;
            await sqlocal.sql(stmt, ...values);
            triggerDBUpdate();
        }
    },

    sales: {
        async add(sale: Omit<Sale, 'id'>) {
            await sqlocal.transaction(async tx => {
                const res = await tx.sql`
          INSERT INTO sales (
            bill_number, total_amount, payment_mode, customer_name, is_active, created_at, updated_at, created_by, updated_by, sync_status
          ) VALUES (
            ${sale.bill_number}, ${sale.total_amount}, ${sale.payment_mode}, ${sale.customer_name || null}, ${sale.is_active},
            ${sale.created_at}, ${sale.updated_at}, ${sale.created_by}, ${sale.updated_by}, ${sale.sync_status || null}
          ) RETURNING id
        `;
                const saleId = res[0].id;

                for (const item of sale.items) {
                    await tx.sql`
            INSERT INTO sale_items (
              id, sale_id, name, brand, category, unit, quantity, price, total
            ) VALUES (
              ${item.id}, ${saleId}, ${item.name}, ${item.brand || null}, ${item.category || null}, ${item.unit || null},
              ${item.quantity}, ${item.price}, ${item.total}
            )
          `;
                }
            });
            triggerDBUpdate();
        },
        async update(id: number, data: Partial<Sale>) {
            if (data.is_active !== undefined) {
                await sqlocal.sql`UPDATE sales SET is_active = ${data.is_active}, updated_at = ${Date.now()} WHERE id = ${id}`;
                triggerDBUpdate();
            }
        },
        async getInRange(from: number, to: number): Promise<Sale[]> {
            const sales = await sqlocal.sql`SELECT * FROM sales WHERE is_active = 1 AND created_at >= ${from} AND created_at <= ${to} ORDER BY created_at DESC`;
            if (sales.length === 0) return [];

            const ids = sales.map(s => s.id);
            const items = await sqlocal.sql(`SELECT * FROM sale_items WHERE sale_id IN (${ids.join(',')})`);

            return sales.map(s => ({
                ...s,
                items: items.filter(i => i.sale_id === s.id) as SaleItem[]
            })) as Sale[];
        }
    },

    purchases: {
        async add(purchase: Omit<Purchase, 'id'>) {
            await sqlocal.transaction(async tx => {
                const res = await tx.sql`
          INSERT INTO purchases (
            supplier_name, invoice_number, total_amount, extra_costs_transport, extra_costs_loading, extra_costs_misc,
            grand_total, payment_mode, notes, is_active, created_at, updated_at, created_by, updated_by, sync_status
          ) VALUES (
            ${purchase.supplier_name}, ${purchase.invoice_number}, ${purchase.total_amount},
            ${purchase.extra_costs?.transport || null}, ${purchase.extra_costs?.loading || null}, ${purchase.extra_costs?.misc || null},
            ${purchase.grand_total || null}, ${purchase.payment_mode}, ${purchase.notes || null},
            ${purchase.is_active}, ${purchase.created_at}, ${purchase.updated_at}, ${purchase.created_by}, ${purchase.updated_by}, ${purchase.sync_status || null}
          ) RETURNING id
        `;
                const purchaseId = res[0].id;

                for (const item of purchase.items) {
                    await tx.sql`
             INSERT INTO purchase_items (
               id, purchase_id, name, brand, category, unit, quantity, purchase_price, total
             ) VALUES (
               ${item.id}, ${purchaseId}, ${item.name}, ${item.brand || null}, ${item.category || null},
               ${item.unit || null}, ${item.quantity}, ${item.purchase_price}, ${item.total}
             )
          `;
                }
            });
            triggerDBUpdate();
        },
        async update(id: number, data: Partial<Purchase>) {
            if (data.is_active !== undefined) {
                await sqlocal.sql`UPDATE purchases SET is_active = ${data.is_active}, updated_at = ${Date.now()} WHERE id = ${id}`;
                triggerDBUpdate();
            }
        },
        async getInRange(from: number, to: number): Promise<Purchase[]> {
            const purchases = await sqlocal.sql`SELECT * FROM purchases WHERE is_active = 1 AND created_at >= ${from} AND created_at <= ${to} ORDER BY created_at DESC`;
            if (purchases.length === 0) return [];

            const ids = purchases.map(p => p.id);
            const items = await sqlocal.sql(`SELECT * FROM purchase_items WHERE purchase_id IN (${ids.join(',')})`);

            return purchases.map(p => ({
                ...p,
                extra_costs: {
                    transport: p.extra_costs_transport || undefined,
                    loading: p.extra_costs_loading || undefined,
                    misc: p.extra_costs_misc || undefined,
                },
                items: items.filter(i => i.purchase_id === p.id) as PurchaseItem[]
            })) as Purchase[];
        }
    },

    khata: {
        async add(k: Omit<Khata, 'id'>) {
            await sqlocal.sql`
        INSERT INTO khata (
          customer_name, phone_number, total_credit, pending_amount, paid_amount, notes,
          is_active, created_at, updated_at, created_by, updated_by, sync_status
        ) VALUES (
          ${k.customer_name}, ${k.phone_number}, ${k.total_credit}, ${k.pending_amount}, ${k.paid_amount}, ${k.notes || null},
          ${k.is_active}, ${k.created_at}, ${k.updated_at}, ${k.created_by}, ${k.updated_by}, ${k.sync_status || null}
        )
      `;
            triggerDBUpdate();
        },

        async update(id: number, data: Partial<Khata>) {
            if (data.is_active !== undefined) {
                await sqlocal.sql`UPDATE khata SET is_active = ${data.is_active}, updated_at = ${Date.now()} WHERE id = ${id}`;
            }
            if (data.paid_amount !== undefined && data.pending_amount !== undefined) {
                await sqlocal.sql`UPDATE khata SET paid_amount = ${data.paid_amount}, pending_amount = ${data.pending_amount}, updated_at = ${Date.now()} WHERE id = ${id}`;
            }
            triggerDBUpdate();
        },

        async addPayment(khataId: number, payment: KhataPayment) {
            await sqlocal.sql`
          INSERT INTO khata_payments (
             id, khata_id, amount, paid_at, note
          ) VALUES (
             ${payment.id}, ${khataId}, ${payment.amount}, ${payment.paid_at}, ${payment.note || null}
          )
       `;
            triggerDBUpdate();
        },

        async getAllActive(): Promise<Khata[]> {
            const records = await sqlocal.sql`SELECT * FROM khata WHERE is_active = 1 ORDER BY updated_at DESC`;
            if (records.length === 0) return [];

            const ids = records.map(r => r.id);
            const payments = await sqlocal.sql(`SELECT * FROM khata_payments WHERE khata_id IN (${ids.join(',')}) ORDER BY paid_at DESC`);

            return records.map(r => ({
                ...r,
                payment_history: payments.filter(p => p.khata_id === r.id) as KhataPayment[]
            })) as Khata[];
        }
    },

    expenses: {
        async add(e: Omit<Expense, 'id'>) {
            await sqlocal.sql`
         INSERT INTO expenses (
            category, amount, notes, is_active, created_at, updated_at, created_by, updated_by, sync_status
         ) VALUES (
            ${e.category}, ${e.amount}, ${e.notes || null}, ${e.is_active},
            ${e.created_at}, ${e.updated_at}, ${e.created_by}, ${e.updated_by}, ${e.sync_status || null}
         )
       `;
            triggerDBUpdate();
        },
        async update(id: number, data: Partial<Expense>) {
            if (data.is_active !== undefined) {
                await sqlocal.sql`UPDATE expenses SET is_active = ${data.is_active}, updated_at = ${Date.now()} WHERE id = ${id}`;
                triggerDBUpdate();
            }
        },
        async getInRange(from: number, to: number): Promise<Expense[]> {
            return await sqlocal.sql`SELECT * FROM expenses WHERE is_active = 1 AND created_at >= ${from} AND created_at <= ${to} ORDER BY created_at DESC` as Expense[];
        }
    }
};
