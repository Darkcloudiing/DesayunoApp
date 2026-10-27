import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'desayuno.db');
export const db = new DatabaseSync(dbPath);

export const OFFICIAL_TICKETS = [
  {
    title: '1 Aceite de Oliva (250ml) + 1 Queso Crema + 1 Vinagre',
    items: [
      { name: 'Aceite de Oliva Extra Virgen (250ml)', qty: '1 botella (250ml)', cost: 7.50 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 },
      { name: 'Vinagre', qty: '1 botella', cost: 2.32 }
    ],
    category: 'Aceites & Desayuno',
    cost: 11.32,
    notes: 'Aceite de oliva virgen extra de 250ml, queso crema untable y vinagre para aderezos.'
  },
  {
    title: '1 Aceite de Oliva (250ml) + 1 Queso Crema + 1 Servilletas',
    items: [
      { name: 'Aceite de Oliva Extra Virgen (250ml)', qty: '1 botella (250ml)', cost: 7.50 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 },
      { name: 'Paquete de Servilletas', qty: '1 paquete', cost: 2.40 }
    ],
    category: 'Aceites & Desechables',
    cost: 11.40,
    notes: 'Botella de aceite de oliva 250ml, queso crema untable y servilletas de papel.'
  },
  {
    title: '1 kg Jamón de Pavo rebanado (Boleto A)',
    items: [
      { name: 'Jamón de Pavo rebanado', qty: '1 kg', cost: 10.85 }
    ],
    category: 'Proteína',
    cost: 10.85,
    notes: 'Jamón de pavo fresco rebanado para sándwiches.'
  },
  {
    title: '1 kg Jamón de Pavo rebanado (Boleto B)',
    items: [
      { name: 'Jamón de Pavo rebanado', qty: '1 kg', cost: 10.85 }
    ],
    category: 'Proteína',
    cost: 10.85,
    notes: 'Jamón de pavo fresco rebanado para sándwiches.'
  },
  {
    title: '750g Mortadela rebanada (Boleto A)',
    items: [
      { name: 'Mortadela rebanada', qty: '750g', cost: 10.00 }
    ],
    category: 'Proteína',
    cost: 10.00,
    notes: 'Mortadela fresca rebanada.'
  },
  {
    title: '750g Mortadela rebanada (Boleto B)',
    items: [
      { name: 'Mortadela rebanada', qty: '750g', cost: 10.00 }
    ],
    category: 'Proteína',
    cost: 10.00,
    notes: 'Mortadela fresca rebanada.'
  },
  {
    title: '1 Salami 150g + 1 kg Tomate + 1 Lechuga (Boleto A)',
    items: [
      { name: 'Salami sellado (150g)', qty: '1 unidad (150g)', cost: 6.00 },
      { name: 'Tomate fresco', qty: '1 kg', cost: 4.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 11.20,
    notes: 'Salami sellado, tomates frescos y lechuga limpia para sándwiches.'
  },
  {
    title: '1 Salami 150g + 1 kg Tomate + 1 Lechuga (Boleto B)',
    items: [
      { name: 'Salami sellado (150g)', qty: '1 unidad (150g)', cost: 6.00 },
      { name: 'Tomate fresco', qty: '1 kg', cost: 4.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 11.20,
    notes: 'Salami sellado, tomates frescos y lechuga limpia para sándwiches.'
  },
  {
    title: '1 Salami 150g + 1.1 kg Cebolla + 1 Lechuga (Boleto A)',
    items: [
      { name: 'Salami sellado (150g)', qty: '1 unidad (150g)', cost: 6.00 },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 10.82,
    notes: 'Salami sellado, cebollas frescas y lechuga.'
  },
  {
    title: '1 Salami 150g + 1.1 kg Cebolla + 1 Lechuga (Boleto B)',
    items: [
      { name: 'Salami sellado (150g)', qty: '1 unidad (150g)', cost: 6.00 },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 10.82,
    notes: 'Salami sellado, cebollas frescas y lechuga.'
  },
  {
    title: '1 Salami 150g + 2 Combos Pan Canilla',
    items: [
      { name: 'Salami sellado (150g)', qty: '1 unidad (150g)', cost: 6.00 },
      { name: 'Combos de Pan Canilla', qty: '2 combos', cost: 5.20 }
    ],
    category: 'Proteína & Pan',
    cost: 11.20,
    notes: 'Salami sellado de 150g y 2 combos de pan canilla fresco de panadería.'
  },
  {
    title: '400g Pepperoni + 1 Paquete de Fajitas',
    items: [
      { name: 'Pepperoni rebanado', qty: '400g', cost: 7.28 },
      { name: 'Paquete de Fajitas / Tortillas', qty: '1 paquete', cost: 3.80 }
    ],
    category: 'Proteína & Fajitas',
    cost: 11.08,
    notes: 'Pepperoni rebanado y 1 paquete de fajitas/tortillas de trigo.'
  },
  {
    title: '400g Pepperoni + 1 Queso Crema + 1 Servilletas',
    items: [
      { name: 'Pepperoni rebanado', qty: '400g', cost: 7.28 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 },
      { name: 'Paquete de Servilletas', qty: '1 paquete', cost: 2.40 }
    ],
    category: 'Proteína & Desechables',
    cost: 11.18,
    notes: 'Pepperoni rebanado, tarrina de queso crema y paquete de servilletas.'
  },
  {
    title: '550g Queso Amarillo rebanado (Boleto A)',
    items: [
      { name: 'Queso Amarillo rebanado', qty: '550g', cost: 11.00 }
    ],
    category: 'Lácteos',
    cost: 11.00,
    notes: 'Queso amarillo rebanado en lonjas.'
  },
  {
    title: '550g Queso Amarillo rebanado (Boleto B)',
    items: [
      { name: 'Queso Amarillo rebanado', qty: '550g', cost: 11.00 }
    ],
    category: 'Lácteos',
    cost: 11.00,
    notes: 'Queso amarillo rebanado en lonjas.'
  },
  {
    title: '500g Queso Amarillo + 1 Queso Crema (250g)',
    items: [
      { name: 'Queso Amarillo rebanado', qty: '500g', cost: 10.00 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 }
    ],
    category: 'Lácteos',
    cost: 11.50,
    notes: 'Queso amarillo rebanado y queso crema untable.'
  },
  {
    title: '3 Combos Pan Canilla + 1 Paquete Platos (Boleto A)',
    items: [
      { name: 'Combos de Pan Canilla', qty: '3 combos', cost: 7.80 },
      { name: 'Paquete de Platos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Pan & Desechables',
    cost: 10.80,
    notes: 'Pan canilla fresco de panadería y platos desechables.'
  },
  {
    title: '3 Combos Pan Canilla + 1 Paquete Platos (Boleto B)',
    items: [
      { name: 'Combos de Pan Canilla', qty: '3 combos', cost: 7.80 },
      { name: 'Paquete de Platos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Pan & Desechables',
    cost: 10.80,
    notes: 'Pan canilla fresco de panadería y platos desechables.'
  },
  {
    title: '2 Frascos de Aderezo César o Ranch',
    items: [
      { name: 'Aderezo César o Ranch', qty: '2 frascos', cost: 11.00 }
    ],
    category: 'Salsas & Aderezos',
    cost: 11.00,
    notes: 'Dos frascos de aderezo cremoso César o Ranch ($5.50 c/u).'
  },
  {
    title: '2 Jugos grandes pasteurizados (Boleto A)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 }
    ],
    category: 'Bebidas',
    cost: 10.00,
    notes: 'Dos botellas grandes de jugo pasteurizado (naranja, durazno o pera).'
  },
  {
    title: '2 Jugos grandes pasteurizados (Boleto B)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 }
    ],
    category: 'Bebidas',
    cost: 10.00,
    notes: 'Dos botellas grandes de jugo pasteurizado (naranja, durazno o pera).'
  },
  {
    title: '2 Jugos grandes pasteurizados (Boleto C)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 }
    ],
    category: 'Bebidas',
    cost: 10.00,
    notes: 'Dos botellas grandes de jugo pasteurizado (naranja, durazno o pera).'
  },
  {
    title: '2 Jugos grandes pasteurizados (Boleto D)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 }
    ],
    category: 'Bebidas',
    cost: 10.00,
    notes: 'Dos botellas grandes de jugo pasteurizado (naranja, durazno o pera).'
  },
  {
    title: '1 Frasco Aceitunas + 1 Aderezo Tata + 1 Paquete Vasos (Boleto A)',
    items: [
      { name: 'Frascos de Aceitunas rellenas', qty: '1 frasco', cost: 3.90 },
      { name: 'Aderezo Tata', qty: '1 frasco', cost: 4.50 },
      { name: 'Paquete de Vasos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Acompañamientos & Desechables',
    cost: 11.40,
    notes: 'Aceitunas rellenas, aderezo Tata y vasos plásticos para el desayuno.'
  },
  {
    title: '1 Frasco Aceitunas + 1 Aderezo Tata + 1 Paquete Vasos (Boleto B)',
    items: [
      { name: 'Frascos de Aceitunas rellenas', qty: '1 frasco', cost: 3.90 },
      { name: 'Aderezo Tata', qty: '1 frasco', cost: 4.50 },
      { name: 'Paquete de Vasos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Acompañamientos & Desechables',
    cost: 11.40,
    notes: 'Aceitunas rellenas, aderezo Tata y vasos plásticos para el desayuno.'
  }
];

// Initialize tables and seed official tickets
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT,
      target_budget_per_person REAL DEFAULT 10.83,
      admin_pin TEXT DEFAULT '2972',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      items_json TEXT NOT NULL,
      category TEXT DEFAULT 'Ingrediente',
      estimated_cost REAL NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'available',
      assigned_to TEXT DEFAULT NULL,
      assigned_phone TEXT DEFAULT NULL,
      device_fingerprint TEXT DEFAULT NULL,
      assigned_at TEXT DEFAULT NULL,
      is_purchased INTEGER DEFAULT 0,
      purchased_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id)
    );
  `);

  // Migration: Add is_purchased and purchased_at columns if upgrading from earlier schema
  try {
    db.prepare('ALTER TABLE tickets ADD COLUMN is_purchased INTEGER DEFAULT 0').run();
  } catch {
    // Column already exists
  }
  try {
    db.prepare('ALTER TABLE tickets ADD COLUMN purchased_at TEXT DEFAULT NULL').run();
  } catch {
    // Column already exists
  }

  // Migrate any previous default pin to 2972
  db.prepare("UPDATE events SET admin_pin = '2972' WHERE admin_pin = '1234'").run();

  // Check event
  let event = db.prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (!event) {
    const insertEvent = db.prepare(`
      INSERT INTO events (title, description, target_date, target_budget_per_person, admin_pin)
      VALUES (?, ?, ?, ?, ?)
    `);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = insertEvent.run(
      'Gran Desayuno de la Oficina 🥖🥪',
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 25 boletos balanceados para 25 compañeros.',
      tomorrow,
      10.83,
      '2972'
    );
    event = { id: res.lastInsertRowid };
  } else {
    db.prepare(`
      UPDATE events 
      SET title = ?, description = ?, target_budget_per_person = ?, admin_pin = '2972'
      WHERE id = ?
    `).run(
      'Gran Desayuno de la Oficina 🥖🥪',
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 25 boletos balanceados para 25 compañeros.',
      10.83,
      event.id
    );
  }

  // Only populate official tickets if the tickets table for this event is completely empty (count === 0)
  const countObj = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE event_id = ?').get(event.id);
  if (!countObj || countObj.count === 0) {
    const insertTicket = db.prepare(`
      INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const t of OFFICIAL_TICKETS) {
      insertTicket.run(
        event.id,
        t.title,
        JSON.stringify(t.items),
        t.category,
        t.cost,
        t.notes
      );
    }
  }
}
