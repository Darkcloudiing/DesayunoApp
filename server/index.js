import express from 'express';
import cors from 'cors';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { db, initDb } from './db.js';
import { balanceItems, PRESETS } from './balancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & seed data
initDb();

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production' || !!process.env.PORT;
const CLIENT_PORT = isProd ? PORT : 3000;

app.use(cors());
app.use(express.json());

// Helper: Get local network IPv4 addresses
function getNetworkIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({
          interface: name,
          ip: net.address
        });
      }
    }
  }
  return results;
}

// ---------------------- Network Info ----------------------
app.get('/api/network-info', (req, res) => {
  const ips = getNetworkIps();
  const preferredIp = ips.length > 0 ? ips[0].ip : 'localhost';
  res.json({
    ips,
    preferredIp,
    clientPort: CLIENT_PORT,
    serverPort: PORT,
    suggestedUrl: `http://${preferredIp}:${CLIENT_PORT}`
  });
});

// ---------------------- Event Details ----------------------
app.get('/api/event', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) {
      return res.status(404).json({ error: 'No hay ningún evento activo.' });
    }

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_tickets,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_tickets,
        COALESCE(SUM(estimated_cost), 0) as total_budget,
        COALESCE(AVG(estimated_cost), 0) as avg_cost,
        COALESCE(MIN(estimated_cost), 0) as min_cost,
        COALESCE(MAX(estimated_cost), 0) as max_cost
      FROM tickets 
      WHERE event_id = ?
    `).get(event.id);

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        target_date: event.target_date,
        target_budget_per_person: event.target_budget_per_person,
        created_at: event.created_at
      },
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/event', (req, res) => {
  try {
    const { title, description, target_date, admin_pin } = req.body;
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    if (admin_pin) {
      db.prepare(`
        UPDATE events 
        SET title = ?, description = ?, target_date = ?, admin_pin = ? 
        WHERE id = ?
      `).run(title, description, target_date, admin_pin, event.id);
    } else {
      db.prepare(`
        UPDATE events 
        SET title = ?, description = ?, target_date = ? 
        WHERE id = ?
      `).run(title, description, target_date, event.id);
    }

    res.json({ success: true, message: 'Evento actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Admin Auth Check ----------------------
app.post('/api/admin/verify-pin', (req, res) => {
  const { pin } = req.body;
  const event = db.prepare('SELECT admin_pin FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
  if (event && event.admin_pin === pin) {
    res.json({ authorized: true });
  } else {
    res.status(401).json({ authorized: false, error: 'PIN de administrador incorrecto' });
  }
});

// ---------------------- Tickets CRUD & Presets ----------------------
app.get('/api/tickets', (req, res) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.json([]);

    const tickets = db.prepare(`
      SELECT * FROM tickets WHERE event_id = ? ORDER BY id ASC
    `).all(event.id);

    const parsed = tickets.map(t => {
      let items = [];
      try {
        items = JSON.parse(t.items_json);
      } catch {
        items = [{ name: t.title, qty: '1', cost: t.estimated_cost }];
      }
      return { ...t, items };
    });

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', (req, res) => {
  try {
    const { title, items, category, estimated_cost, notes } = req.body;
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const itemsJson = JSON.stringify(items || [{ name: title, qty: '1 unidad', cost: estimated_cost }]);
    const result = db.prepare(`
      INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(event.id, title, itemsJson, category || 'General', Number(estimated_cost) || 0, notes || '');

    res.json({ success: true, ticketId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tickets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, items, category, estimated_cost, notes, status, assigned_to } = req.body;

    const itemsJson = items ? JSON.stringify(items) : undefined;
    const current = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Ticket no encontrado' });

    db.prepare(`
      UPDATE tickets 
      SET title = ?, items_json = ?, category = ?, estimated_cost = ?, notes = ?, status = ?, assigned_to = ?
      WHERE id = ?
    `).run(
      title ?? current.title,
      itemsJson ?? current.items_json,
      category ?? current.category,
      estimated_cost ?? current.estimated_cost,
      notes ?? current.notes,
      status ?? current.status,
      assigned_to ?? current.assigned_to,
      id
    );

    res.json({ success: true, message: 'Ticket actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tickets/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    res.json({ success: true, message: 'Ticket eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Balance tickets from custom items list
app.post('/api/tickets/auto-balance', (req, res) => {
  try {
    const { items, participantCount, replaceExisting } = req.body;
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const balancedBuckets = balanceItems(items, Number(participantCount) || 8);

    if (replaceExisting) {
      db.prepare('DELETE FROM tickets WHERE event_id = ?').run(event.id);
    }

    const insert = db.prepare(`
      INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const b of balancedBuckets) {
      insert.run(
        event.id,
        b.title,
        JSON.stringify(b.items),
        b.category,
        b.estimated_cost,
        b.notes
      );
    }

    res.json({ success: true, generatedTickets: balancedBuckets.length, tickets: balancedBuckets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load thematic preset
app.post('/api/tickets/preset', (req, res) => {
  try {
    const { presetKey, replaceExisting } = req.body;
    const preset = PRESETS[presetKey];
    if (!preset) return res.status(400).json({ error: 'Preset desconocido' });

    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const balancedBuckets = balanceItems(preset.items, preset.targetCount);

    if (replaceExisting !== false) {
      db.prepare('DELETE FROM tickets WHERE event_id = ?').run(event.id);
    }

    const insert = db.prepare(`
      INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const b of balancedBuckets) {
      insert.run(
        event.id,
        b.title,
        JSON.stringify(b.items),
        b.category,
        b.estimated_cost,
        b.notes
      );
    }

    res.json({ success: true, presetName: preset.name, count: balancedBuckets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Lottery / Draw Participant Flow ----------------------

// Check if participant already has a ticket
app.post('/api/lottery/check-my-ticket', (req, res) => {
  try {
    const { name, deviceFingerprint } = req.body;
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    let existing = null;
    if (deviceFingerprint) {
      existing = db.prepare(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND device_fingerprint = ? AND status = 'assigned'
      `).get(event.id, deviceFingerprint);
    }

    if (!existing && name && name.trim()) {
      existing = db.prepare(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND LOWER(TRIM(assigned_to)) = LOWER(TRIM(?)) AND status = 'assigned'
      `).get(event.id, name.trim());
    }

    if (existing) {
      existing.items = JSON.parse(existing.items_json);
      return res.json({ found: true, ticket: existing });
    }

    res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perform the live draw
app.post('/api/lottery/draw', (req, res) => {
  try {
    const { name, phone, deviceFingerprint } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Por favor ingresa tu nombre completo o apodo.' });
    }

    const trimmedName = name.trim();
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // 1. Check if this person or device already has a ticket
    let existing = null;
    if (deviceFingerprint) {
      existing = db.prepare(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND device_fingerprint = ? AND status = 'assigned'
      `).get(event.id, deviceFingerprint);
    }

    if (!existing) {
      existing = db.prepare(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND LOWER(TRIM(assigned_to)) = LOWER(TRIM(?)) AND status = 'assigned'
      `).get(event.id, trimmedName);
    }

    if (existing) {
      existing.items = JSON.parse(existing.items_json);
      return res.json({
        success: true,
        alreadyDrawn: true,
        message: '¡Ya tenías un ticket asignado previamente!',
        ticket: existing
      });
    }

    // 2. Select an available ticket at random
    const availableTicket = db.prepare(`
      SELECT * FROM tickets 
      WHERE event_id = ? AND status = 'available' 
      ORDER BY RANDOM() 
      LIMIT 1
    `).get(event.id);

    if (!availableTicket) {
      return res.status(409).json({
        error: '¡Oops! Ya no quedan tickets disponibles para este sorteo. Todos los puestos han sido tomados.'
      });
    }

    // 3. Atomically assign the ticket
    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE tickets 
      SET status = 'assigned', 
          assigned_to = ?, 
          assigned_phone = ?, 
          device_fingerprint = ?, 
          assigned_at = ? 
      WHERE id = ? AND status = 'available'
    `).run(trimmedName, phone ? phone.trim() : null, deviceFingerprint || null, nowIso, availableTicket.id);

    // Fetch the updated record
    const updated = db.prepare('SELECT * FROM tickets WHERE id = ?').get(availableTicket.id);
    updated.items = JSON.parse(updated.items_json);

    res.json({
      success: true,
      alreadyDrawn: false,
      ticket: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Release ticket for test re-roll from participant phone
app.post('/api/lottery/release-my-ticket', (req, res) => {
  try {
    const { deviceFingerprint, ticketId } = req.body;
    if (ticketId) {
      db.prepare(`
        UPDATE tickets 
        SET status = 'available', assigned_to = NULL, assigned_phone = NULL, device_fingerprint = NULL, assigned_at = NULL 
        WHERE id = ?
      `).run(ticketId);
    } else if (deviceFingerprint) {
      db.prepare(`
        UPDATE tickets 
        SET status = 'available', assigned_to = NULL, assigned_phone = NULL, device_fingerprint = NULL, assigned_at = NULL 
        WHERE device_fingerprint = ?
      `).run(deviceFingerprint);
    }
    res.json({ success: true, message: 'Ticket liberado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Admin Management Actions ----------------------

// Unassign / Release ticket
app.post('/api/admin/release-ticket/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare(`
      UPDATE tickets 
      SET status = 'available', 
          assigned_to = NULL, 
          assigned_phone = NULL, 
          device_fingerprint = NULL, 
          assigned_at = NULL 
      WHERE id = ?
    `).run(id);

    res.json({ success: true, message: 'Ticket liberado y disponible nuevamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual assignment by admin
app.post('/api/admin/assign-manual', (req, res) => {
  try {
    const { ticketId, name, phone } = req.body;
    if (!ticketId || !name) {
      return res.status(400).json({ error: 'Ticket y nombre son obligatorios.' });
    }

    const nowIso = new Date().toISOString();
    db.prepare(`
      UPDATE tickets 
      SET status = 'assigned', 
          assigned_to = ?, 
          assigned_phone = ?, 
          assigned_at = ? 
      WHERE id = ?
    `).run(name.trim(), phone ? phone.trim() : null, nowIso, ticketId);

    res.json({ success: true, message: 'Ticket asignado manualmente con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset entire lottery (keep tickets, release assignments)
app.post('/api/admin/reset-lottery', (req, res) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    db.prepare(`
      UPDATE tickets 
      SET status = 'available', 
          assigned_to = NULL, 
          assigned_phone = NULL, 
          device_fingerprint = NULL, 
          assigned_at = NULL 
      WHERE event_id = ?
    `).run(event.id);

    res.json({ success: true, message: 'Sorteo reiniciado. Todos los tickets están disponibles de nuevo.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export WhatsApp formatted message
app.get('/api/admin/export-summary', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get();
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const tickets = db.prepare('SELECT * FROM tickets WHERE event_id = ? ORDER BY category, id').all(event.id);

    let text = `🍳 *${event.title.toUpperCase()}* 🥐\n`;
    if (event.target_date) {
      text += `📅 *Fecha:* ${event.target_date}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    let totalBudget = 0;
    let assignedCount = 0;

    // Group by status
    const assigned = tickets.filter(t => t.status === 'assigned');
    const pending = tickets.filter(t => t.status === 'available');

    if (assigned.length > 0) {
      text += `✅ *PARTICIPANTES CONFIRMADOS:*\n`;
      for (const t of assigned) {
        totalBudget += t.estimated_cost;
        assignedCount++;
        text += `• 👤 *${t.assigned_to}* 👉 ${t.title} (~$${t.estimated_cost.toFixed(2)})\n`;
      }
      text += `\n`;
    }

    if (pending.length > 0) {
      text += `⏳ *TICKETS AÚN DISPONIBLES (${pending.length}):*\n`;
      for (const t of pending) {
        text += `• 🎟️ ${t.title} (~$${t.estimated_cost.toFixed(2)})\n`;
      }
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Resumen:* ${assignedCount}/${tickets.length} personas listas | Presupuesto total: ~$${totalBudget.toFixed(2)}\n`;
    text += `¡No olviden traer sus cosas frescas antes de la hora indicada! ☕🥖`;

    res.json({ text, totalBudget, assignedCount, totalTickets: tickets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend build if dist folder exists
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DesayunApp Backend escuchando en http://0.0.0.0:${PORT}`);
  const ips = getNetworkIps();
  console.log('📡 Interfaces de red disponibles:');
  ips.forEach(net => console.log(`   - ${net.interface}: http://${net.ip}:${PORT}`));
});
