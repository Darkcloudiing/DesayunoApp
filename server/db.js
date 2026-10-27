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
    title: '4 Combos de Pan Canilla + 1 Paquete de Vasos',
    items: [
      { name: 'Combos de Pan Canilla', qty: '4 combos', cost: 10.40 },
      { name: 'Paquete de Vasos', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Pan & Desechables',
    cost: 13.40,
    notes: 'Pan fresco de panadería para los sándwiches.'
  },
  {
    title: '1 Botella de Aceite de Oliva Extra Virgen',
    items: [
      { name: 'Aceite de Oliva Extra Virgen', qty: '1 botella', cost: 15.00 }
    ],
    category: 'Aceites & Condimentos',
    cost: 15.00,
    notes: 'Para aderezar los panes y ensaladas.'
  },
  {
    title: '1 kg Jamón de Pavo + 1 Vinagre',
    items: [
      { name: 'Jamón de Pavo', qty: '1 kg', cost: 10.85 },
      { name: 'Vinagre', qty: '1 botella', cost: 2.32 }
    ],
    category: 'Proteína & Condimentos',
    cost: 13.17,
    notes: 'Rebanado para rellenar.'
  },
  {
    title: '900g de Mortadela + 1 Bolsa de Lechuga',
    items: [
      { name: 'Mortadela rebanada', qty: '900g', cost: 12.05 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 13.25,
    notes: 'Lechuga limpia lista para armar.'
  },
  {
    title: '2 Salamis de 150g + 1 Bolsa de Lechuga (Boleto A)',
    items: [
      { name: 'Salamis de 150g', qty: '2 unidades (300g total)', cost: 12.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 13.20,
    notes: 'Salamis en empaque sellado.'
  },
  {
    title: '2 Salamis de 150g + 1 Bolsa de Lechuga (Boleto B)',
    items: [
      { name: 'Salamis de 150g', qty: '2 unidades (300g total)', cost: 12.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 13.20,
    notes: 'Salamis en empaque sellado.'
  },
  {
    title: '600g de Pepperoni + 1 Queso Crema 250g',
    items: [
      { name: 'Pepperoni rebanado', qty: '600g', cost: 10.92 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 }
    ],
    category: 'Proteína & Lácteos',
    cost: 12.42,
    notes: 'Para untar y rellenar.'
  },
  {
    title: '600g de Queso Amarillo + Medio kilo (500g) de Tomate',
    items: [
      { name: 'Queso Amarillo rebanado', qty: '600g', cost: 12.00 },
      { name: 'Tomate fresco', qty: '500g (medio kilo)', cost: 2.00 }
    ],
    category: 'Lácteos & Vegetales',
    cost: 14.00,
    notes: 'Tomates lavados listos para cortar.'
  },
  {
    title: '500g de Queso Amarillo + 1 kg de Tomate',
    items: [
      { name: 'Queso Amarillo rebanado', qty: '500g', cost: 10.00 },
      { name: 'Tomate fresco', qty: '1 kg', cost: 4.00 }
    ],
    category: 'Lácteos & Vegetales',
    cost: 14.00,
    notes: 'Tomates maduros y firmes.'
  },
  {
    title: '2 Jugos grandes + 1 Paquete de Platos (Boleto A)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 },
      { name: 'Paquete de Platos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Bebidas & Desechables',
    cost: 13.00,
    notes: 'Jugos fríos del sabor preferido.'
  },
  {
    title: '2 Jugos grandes + 1 Paquete de Platos (Boleto B)',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 },
      { name: 'Paquete de Platos desechables', qty: '1 paquete', cost: 3.00 }
    ],
    category: 'Bebidas & Desechables',
    cost: 13.00,
    notes: 'Jugos fríos del sabor preferido.'
  },
  {
    title: '2 Jugos grandes + 1 Paquete de Servilletas',
    items: [
      { name: 'Jugos grandes pasteurizados', qty: '2 botellas', cost: 10.00 },
      { name: 'Paquete de Servilletas', qty: '1 paquete', cost: 2.40 }
    ],
    category: 'Bebidas & Desechables',
    cost: 12.40,
    notes: 'Servilletas de mesa para la comida.'
  },
  {
    title: '2 Aderezos César/Ranch + 1 Queso Crema 250g',
    items: [
      { name: 'Aderezos César o Ranch', qty: '2 frascos', cost: 11.00 },
      { name: 'Queso Crema (250g)', qty: '1 tarrina', cost: 1.50 }
    ],
    category: 'Salsas & Lácteos',
    cost: 12.50,
    notes: 'Salsas cremosas para acompañar los sándwiches.'
  },
  {
    title: '2 Aderezos Tata + 1.1 kg Cebolla',
    items: [
      { name: 'Aderezos Tata', qty: '2 unidades', cost: 9.00 },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62 }
    ],
    category: 'Salsas & Vegetales',
    cost: 12.62,
    notes: 'Cebollas limpias para aderezar.'
  },
  {
    title: '2 Frascos Aceitunas + 1 Paquete Servilletas + 1 Paquete Fajitas',
    items: [
      { name: 'Frascos de Aceitunas', qty: '2 frascos', cost: 7.80 },
      { name: 'Paquete de Servilletas', qty: '1 paquete', cost: 2.40 },
      { name: 'Paquete de Fajitas / Tortillas', qty: '1 paquete', cost: 3.80 }
    ],
    category: 'Acompañamientos & Desechables',
    cost: 14.00,
    notes: 'Aceitunas rellenas o sin hueso.'
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
      target_budget_per_person REAL DEFAULT 13.28,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events (id)
    );
  `);

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
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 15 boletos balanceados para 15 compañeros.',
      tomorrow,
      13.28,
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
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 15 boletos balanceados para 15 compañeros.',
      13.28,
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
