import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = join(__dirname, 'genomahub.db')

const db = new Database(dbPath)

// Enable WAL mode for performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Consumables',
    item_type TEXT NOT NULL CHECK(item_type IN ('Equipment', 'Kit')) DEFAULT 'Kit',
    description TEXT,
    base_price REAL NOT NULL DEFAULT 0,
    datasheet_url TEXT,
    storage_conditions TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    reorder_level INTEGER NOT NULL DEFAULT 5,
    lot_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Laboratory',
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT UNIQUE NOT NULL,
    client_id INTEGER,
    date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
    validity_days INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Sent', 'Accepted', 'Rejected')),
    terms_conditions TEXT DEFAULT 'Standard delivery and installation terms apply. Warranty as per manufacturer guidelines.',
    subtotal REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    total REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS quote_line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    quoted_price REAL NOT NULL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    line_total REAL DEFAULT 0,
    FOREIGN KEY (quote_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
  CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
  CREATE INDEX IF NOT EXISTS idx_line_items_quote ON quote_line_items(quote_id);
  CREATE INDEX IF NOT EXISTS idx_products_type ON products(item_type);
  CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON inventory(expiry_date);
`)

export default db
