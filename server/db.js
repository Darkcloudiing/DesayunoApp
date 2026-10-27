import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database mode: PostgreSQL (Neon.tech / Cloud) or SQLite (Local fallback)
export const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('🐘 DesayunApp Backend conectado a PostgreSQL (Neon.tech)');
} else {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'desayuno.db');
  sqliteDb = new DatabaseSync(dbPath);
  console.log('💾 DesayunApp Backend usando SQLite local:', dbPath);
}

// Unified query helpers
export async function query(sql, params = []) {
  if (isPostgres) {
    let pIdx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++pIdx}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

export async function queryOne(sql, params = []) {
  if (isPostgres) {
    let pIdx = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++pIdx}`);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return sqliteDb.prepare(sql).get(...params) || null;
  }
}

export async function execute(sql, params = []) {
  if (isPostgres) {
    let pIdx = 0;
    let pgSql = sql.replace(/\?/g, () => `$${++pIdx}`);
    if (/^\s*insert\s+/i.test(pgSql) && !/returning/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }
    const res = await pgPool.query(pgSql, params);
    return { 
      changes: res.rowCount, 
      lastInsertRowid: res.rows[0]?.id 
    };
  } else {
    const info = sqliteDb.prepare(sql).run(...params);
    return { 
      changes: info.changes, 
      lastInsertRowid: info.lastInsertRowid 
    };
  }
}

// String normalizer: Removes accents, lowercases and trims
export function normalizeName(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Flexible matcher for participant name (tolerant to accents, casing, and word order/surnames)
export function matchParticipantTicket(assignedTickets, searchName) {
  if (!searchName || !searchName.trim()) return null;
  const cleanSearch = normalizeName(searchName);
  if (!cleanSearch) return null;

  // 1. Exact match (normalized)
  const exact = assignedTickets.find(t => normalizeName(t.assigned_to) === cleanSearch);
  if (exact) return exact;

  // 2. Exact full string contains (either contains the other)
  const subMatches = assignedTickets.filter(t => {
    const tNorm = normalizeName(t.assigned_to);
    return tNorm.includes(cleanSearch) || cleanSearch.includes(tNorm);
  });
  if (subMatches.length === 1) return subMatches[0];

  // 3. Word token matching with scoring (handles nicknames, typos in first name with correct surname, etc.)
  const searchWords = cleanSearch.split(/\s+/).filter(w => w.length >= 2);
  let bestTicket = null;
  let bestScore = 0;

  for (const t of assignedTickets) {
    const tWords = normalizeName(t.assigned_to).split(/\s+/).filter(Boolean);
    let score = 0;
    for (const sw of searchWords) {
      for (const tw of tWords) {
        if (sw === tw) {
          score += 10; // Exact word match
        } else if (sw.length >= 3 && tw.length >= 3) {
          if (tw.startsWith(sw) || sw.startsWith(tw)) {
            score += 4; // Prefix match
          }
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTicket = t;
    } else if (score === bestScore && score > 0) {
      // Tie (e.g. "Luis" matches both "Luis Pinto" and "Luis Velasquez")
      bestTicket = null;
    }
  }

  if (bestScore >= 10 && bestTicket) {
    return bestTicket;
  }

  return null;
}

// 22 Pre-assigned tickets from user recovery list
export const INITIAL_PREASSIGNMENTS = {
  2: 'Alcides Rivero',
  3: 'Javier Hernandez',
  4: 'Deiker Canelon',
  6: 'Misbeny Salazar',
  7: 'Gabo volcan',
  8: 'Jhonny Frias',
  9: 'Brian delgado',
  10: 'Juan Andrés Gil',
  11: 'Freddy Herrera',
  12: 'Diana Altuve',
  13: 'John Guerrero',
  14: 'Sebastian Goatache',
  15: 'Luis Pinto',
  16: 'Carlos Gonzalez',
  17: 'Andres Alejo',
  18: 'Elio López',
  19: 'José Luis Alvarado',
  20: 'Dailin Romano',
  21: 'Samuel Zerpa',
  22: 'Piter Echezuria',
  23: 'Antonio Puerta',
  24: 'Luis Velasquez'
};

// 25 Official balanced tickets
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
      { name: 'Mortadela rebanada', qty: '750g', cost: 10.04 }
    ],
    category: 'Proteína',
    cost: 10.04,
    notes: 'Mortadela rebanada para rellenar.'
  },
  {
    title: '750g Mortadela rebanada (Boleto B)',
    items: [
      { name: 'Mortadela rebanada', qty: '750g', cost: 10.04 }
    ],
    category: 'Proteína',
    cost: 10.04,
    notes: 'Mortadela rebanada para rellenar.'
  },
  {
    title: '1 Salami 150g + 1 kg Tomate + 1 Lechuga (Boleto A)',
    items: [
      { name: 'Salami sellado', qty: '150g', cost: 6.00 },
      { name: 'Tomate fresco', qty: '1 kg', cost: 4.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 11.20,
    notes: 'Salami de 150g, tomates frescos firmes y lechuga limpia.'
  },
  {
    title: '1 Salami 150g + 1 kg Tomate + 1 Lechuga (Boleto B)',
    items: [
      { name: 'Salami sellado', qty: '150g', cost: 6.00 },
      { name: 'Tomate fresco', qty: '1 kg', cost: 4.00 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 11.20,
    notes: 'Salami de 150g, tomates frescos firmes y lechuga limpia.'
  },
  {
    title: '1 Salami 150g + 1.1 kg Cebolla + 1 Lechuga (Boleto A)',
    items: [
      { name: 'Salami sellado', qty: '150g', cost: 6.00 },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 10.82,
    notes: 'Salami de 150g, cebollas frescas limpias y lechuga.'
  },
  {
    title: '1 Salami 150g + 1.1 kg Cebolla + 1 Lechuga (Boleto B)',
    items: [
      { name: 'Salami sellado', qty: '150g', cost: 6.00 },
      { name: 'Cebolla fresca', qty: '1.1 kg', cost: 3.62 },
      { name: 'Bolsa de Lechuga fresca', qty: '1 bolsa', cost: 1.20 }
    ],
    category: 'Proteína & Vegetales',
    cost: 10.82,
    notes: 'Salami de 150g, cebollas frescas limpias y lechuga.'
  },
  {
    title: '1 Salami 150g + 2 Combos Pan Canilla',
    items: [
      { name: 'Salami sellado', qty: '150g', cost: 6.00 },
      { name: 'Combos de Pan Canilla', qty: '2 combos', cost: 5.20 }
    ],
    category: 'Proteína & Pan',
    cost: 11.20,
    notes: 'Salami de 150g y dos combos de pan canilla fresco de panadería.'
  },
  {
    title: '400g Pepperoni + 1 Paquete de Fajitas',
    items: [
      { name: 'Pepperoni rebanado', qty: '400g', cost: 7.28 },
      { name: 'Paquete de Fajitas / Tortillas', qty: '1 paquete', cost: 3.80 }
    ],
    category: 'Proteína & Pan',
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
export async function initDb() {
  if (isPostgres) {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        target_date TEXT,
        target_budget_per_person REAL DEFAULT 10.83,
        admin_pin TEXT DEFAULT '2972',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    sqliteDb.exec(`
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
  }

  // Ensure is_purchased and purchased_at exist (for older schemas)
  try {
    await execute('ALTER TABLE tickets ADD COLUMN is_purchased INTEGER DEFAULT 0');
  } catch {}
  try {
    await execute('ALTER TABLE tickets ADD COLUMN purchased_at TEXT DEFAULT NULL');
  } catch {}

  // Migrate any previous default pin to 2972
  try {
    await execute("UPDATE events SET admin_pin = '2972' WHERE admin_pin = '1234'");
  } catch {}

  // Check event
  let event = await queryOne('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
  if (!event) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const res = await execute(`
      INSERT INTO events (title, description, target_date, target_budget_per_person, admin_pin)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'Gran Desayuno de la Oficina 🥖🥪',
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 25 boletos balanceados para 25 compañeros.',
      tomorrow,
      10.83,
      '2972'
    ]);
    event = { id: res.lastInsertRowid };
  } else {
    await execute(`
      UPDATE events 
      SET title = ?, description = ?, target_budget_per_person = ?, admin_pin = '2972'
      WHERE id = ?
    `, [
      'Gran Desayuno de la Oficina 🥖🥪',
      '¡Sorteo oficial de aportes para el desayuno de la oficina! 25 boletos balanceados para 25 compañeros.',
      10.83,
      event.id
    ]);
  }

  // Populate official tickets if tickets table for this event is completely empty (count === 0)
  const countObj = await queryOne('SELECT COUNT(*) as count FROM tickets WHERE event_id = ?', [event.id]);
  const currentCount = Number(countObj?.count || 0);

  if (currentCount === 0) {
    console.log('🌱 Sembrando 25 boletos oficiales con 22 participantes preasignados...');
    const nowIso = new Date().toISOString();

    for (let i = 0; i < OFFICIAL_TICKETS.length; i++) {
      const ticketNum = i + 1;
      const t = OFFICIAL_TICKETS[i];
      const preassignedName = INITIAL_PREASSIGNMENTS[ticketNum];
      const status = preassignedName ? 'assigned' : 'available';
      const assignedTo = preassignedName || null;
      const assignedAt = preassignedName ? nowIso : null;

      await execute(`
        INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes, status, assigned_to, assigned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        event.id,
        t.title,
        JSON.stringify(t.items),
        t.category,
        t.cost,
        t.notes,
        status,
        assignedTo,
        assignedAt
      ]);
    }
    console.log('✅ Boletos sembrados con éxito. 22 asignados, 3 disponibles.');
  } else {
    // If tickets already exist in the database, but none are assigned yet (assigned_count === 0),
    // apply the pre-assignments to restore the 22 participants!
    const assignedObj = await queryOne(`
      SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND status = 'assigned'
    `, [event.id]);
    const assignedCount = Number(assignedObj?.count || 0);

    if (assignedCount === 0 && currentCount === 25) {
      console.log('🔄 Aplicando preasignación de 22 participantes a los boletos existentes...');
      const nowIso = new Date().toISOString();
      const allTickets = await query('SELECT id FROM tickets WHERE event_id = ? ORDER BY id ASC', [event.id]);
      for (let i = 0; i < allTickets.length; i++) {
        const ticketNum = i + 1;
        const preassignedName = INITIAL_PREASSIGNMENTS[ticketNum];
        if (preassignedName) {
          await execute(`
            UPDATE tickets 
            SET status = 'assigned', assigned_to = ?, assigned_at = ? 
            WHERE id = ?
          `, [preassignedName, nowIso, allTickets[i].id]);
        }
      }
      console.log('✅ 22 participantes restaurados con éxito.');
    }
  }
}
