import express from 'express';
import cors from 'cors';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { query, queryOne, execute, initDb, normalizeName, matchParticipantTicket, isPostgres } from './db.js';
import { balanceItems, PRESETS } from './balancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema & seed data
await initDb();

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

// Helper: Find assigned ticket flexibly (case-insensitive, accent-insensitive, partial matching)
async function findAssignedTicketByName(eventId, searchName) {
  if (!searchName || !searchName.trim()) return null;
  const assigned = await query(`
    SELECT * FROM tickets 
    WHERE event_id = ? AND status = 'assigned'
  `, [eventId]);
  return matchParticipantTicket(assigned, searchName);
}

// ---------------------- Participant List ----------------------
app.get('/api/lottery/participants', async (req, res) => {
  try {
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.json([]);
    const tickets = await query(`
      SELECT id, assigned_to FROM tickets 
      WHERE event_id = ? AND status = 'assigned' AND assigned_to IS NOT NULL
      ORDER BY assigned_to ASC
    `, [event.id]);
    res.json(tickets.map(t => ({ id: t.id, name: t.assigned_to })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
app.get('/api/event', async (req, res) => {
  try {
    const event = await queryOne('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) {
      return res.status(404).json({ error: 'No hay ningún evento activo.' });
    }

    const rawStats = await queryOne(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_tickets,
        SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END) as assigned_tickets,
        SUM(CASE WHEN status = 'assigned' AND is_purchased = 1 THEN 1 ELSE 0 END) as purchased_tickets,
        COALESCE(SUM(estimated_cost), 0) as total_budget,
        COALESCE(AVG(estimated_cost), 0) as avg_cost,
        COALESCE(MIN(estimated_cost), 0) as min_cost,
        COALESCE(MAX(estimated_cost), 0) as max_cost
      FROM tickets 
      WHERE event_id = ?
    `, [event.id]);

    const stats = {
      total_tickets: Number(rawStats?.total_tickets || 0),
      available_tickets: Number(rawStats?.available_tickets || 0),
      assigned_tickets: Number(rawStats?.assigned_tickets || 0),
      purchased_tickets: Number(rawStats?.purchased_tickets || 0),
      total_budget: Number(rawStats?.total_budget || 0),
      avg_cost: Number(rawStats?.avg_cost || 0),
      min_cost: Number(rawStats?.min_cost || 0),
      max_cost: Number(rawStats?.max_cost || 0)
    };

    res.json({
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        target_date: event.target_date,
        target_budget_per_person: Number(event.target_budget_per_person || 10.83),
        created_at: event.created_at
      },
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/event', async (req, res) => {
  try {
    const { title, description, target_date, admin_pin } = req.body;
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    if (admin_pin) {
      await execute(`
        UPDATE events 
        SET title = ?, description = ?, target_date = ?, admin_pin = ? 
        WHERE id = ?
      `, [title, description, target_date, admin_pin, event.id]);
    } else {
      await execute(`
        UPDATE events 
        SET title = ?, description = ?, target_date = ? 
        WHERE id = ?
      `, [title, description, target_date, event.id]);
    }

    res.json({ success: true, message: 'Evento actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Admin Auth Check ----------------------
app.post('/api/admin/verify-pin', async (req, res) => {
  const { pin } = req.body;
  const event = await queryOne('SELECT admin_pin FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
  if (event && event.admin_pin === pin) {
    res.json({ authorized: true });
  } else {
    res.status(401).json({ authorized: false, error: 'PIN de administrador incorrecto' });
  }
});

// ---------------------- Tickets CRUD & Presets ----------------------
app.get('/api/tickets', async (req, res) => {
  try {
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.json([]);

    const tickets = await query(`
      SELECT * FROM tickets WHERE event_id = ? ORDER BY id ASC
    `, [event.id]);

    const parsed = tickets.map(t => {
      let items = [];
      try {
        items = typeof t.items_json === 'string' ? JSON.parse(t.items_json) : t.items_json;
      } catch {
        items = [{ name: t.title, qty: '1', cost: Number(t.estimated_cost) || 0 }];
      }
      return { 
        ...t, 
        estimated_cost: Number(t.estimated_cost) || 0,
        is_purchased: Number(t.is_purchased || 0),
        items 
      };
    });

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tickets', async (req, res) => {
  try {
    const { title, items, category, estimated_cost, notes } = req.body;
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const itemsJson = JSON.stringify(items || [{ name: title, qty: '1 unidad', cost: Number(estimated_cost) || 0 }]);
    const result = await execute(`
      INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [event.id, title, itemsJson, category || 'General', Number(estimated_cost) || 0, notes || '']);

    res.json({ success: true, ticketId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, items, category, estimated_cost, notes, status, assigned_to } = req.body;

    const itemsJson = items ? JSON.stringify(items) : undefined;
    const current = await queryOne('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!current) return res.status(404).json({ error: 'Ticket no encontrado' });

    await execute(`
      UPDATE tickets 
      SET title = ?, items_json = ?, category = ?, estimated_cost = ?, notes = ?, status = ?, assigned_to = ?
      WHERE id = ?
    `, [
      title ?? current.title,
      itemsJson ?? current.items_json,
      category ?? current.category,
      estimated_cost !== undefined ? Number(estimated_cost) : current.estimated_cost,
      notes ?? current.notes,
      status ?? current.status,
      assigned_to ?? current.assigned_to,
      id
    ]);

    res.json({ success: true, message: 'Ticket actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM tickets WHERE id = ?', [id]);
    res.json({ success: true, message: 'Ticket eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-Balance tickets from custom items list
app.post('/api/tickets/auto-balance', async (req, res) => {
  try {
    const { items, participantCount, replaceExisting } = req.body;
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const balancedBuckets = balanceItems(items, Number(participantCount) || 8);

    if (replaceExisting) {
      await execute('DELETE FROM tickets WHERE event_id = ?', [event.id]);
    }

    for (const b of balancedBuckets) {
      await execute(`
        INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        event.id,
        b.title,
        JSON.stringify(b.items),
        b.category,
        b.estimated_cost,
        b.notes
      ]);
    }

    res.json({ success: true, generatedTickets: balancedBuckets.length, tickets: balancedBuckets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Load thematic preset
app.post('/api/tickets/preset', async (req, res) => {
  try {
    const { presetKey, replaceExisting } = req.body;
    const preset = PRESETS[presetKey];
    if (!preset) return res.status(400).json({ error: 'Preset desconocido' });

    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const balancedBuckets = balanceItems(preset.items, preset.targetCount);

    if (replaceExisting !== false) {
      await execute('DELETE FROM tickets WHERE event_id = ?', [event.id]);
    }

    for (const b of balancedBuckets) {
      await execute(`
        INSERT INTO tickets (event_id, title, items_json, category, estimated_cost, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        event.id,
        b.title,
        JSON.stringify(b.items),
        b.category,
        b.estimated_cost,
        b.notes
      ]);
    }

    res.json({ success: true, presetName: preset.name, count: balancedBuckets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Lottery / Draw Participant Flow ----------------------

// Check if participant already has a ticket (by id, device fingerprint, or name)
app.post('/api/lottery/check-my-ticket', async (req, res) => {
  try {
    const { name, deviceFingerprint, ticketId } = req.body;
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    let existing = null;
    if (ticketId) {
      existing = await queryOne(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND id = ? AND status = 'assigned'
      `, [event.id, ticketId]);
    }

    if (!existing && deviceFingerprint) {
      existing = await queryOne(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND device_fingerprint = ? AND status = 'assigned'
      `, [event.id, deviceFingerprint]);
    }

    // Flexible name lookup (case-insensitive & accent-insensitive)
    if (!existing && name && name.trim()) {
      existing = await findAssignedTicketByName(event.id, name);
    }

    if (existing) {
      // Auto-bind device fingerprint if provided
      if (deviceFingerprint && (!existing.device_fingerprint || existing.device_fingerprint !== deviceFingerprint)) {
        await execute('UPDATE tickets SET device_fingerprint = ? WHERE id = ?', [deviceFingerprint, existing.id]);
        existing.device_fingerprint = deviceFingerprint;
      }

      try {
        existing.items = typeof existing.items_json === 'string' ? JSON.parse(existing.items_json) : existing.items_json;
      } catch {
        existing.items = [];
      }
      existing.estimated_cost = Number(existing.estimated_cost) || 0;
      existing.is_purchased = Number(existing.is_purchased || 0);

      return res.json({ found: true, ticket: existing });
    }

    res.json({ found: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perform the live draw or recover pre-assigned ticket
app.post('/api/lottery/draw', async (req, res) => {
  try {
    const { name, phone, deviceFingerprint } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Por favor ingresa tu nombre completo o apodo.' });
    }

    const trimmedName = name.trim();
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // 1. Check if device already has a ticket
    let existing = null;
    if (deviceFingerprint) {
      existing = await queryOne(`
        SELECT * FROM tickets 
        WHERE event_id = ? AND device_fingerprint = ? AND status = 'assigned'
      `, [event.id, deviceFingerprint]);
    }

    // 2. Check if this person already has a pre-assigned ticket (flexible name search!)
    if (!existing) {
      existing = await findAssignedTicketByName(event.id, trimmedName);
    }

    if (existing) {
      // Bind device fingerprint to the preassigned ticket
      if (deviceFingerprint) {
        await execute(`
          UPDATE tickets 
          SET device_fingerprint = ?, assigned_phone = COALESCE(?, assigned_phone) 
          WHERE id = ?
        `, [deviceFingerprint, phone ? phone.trim() : null, existing.id]);
      }

      try {
        existing.items = typeof existing.items_json === 'string' ? JSON.parse(existing.items_json) : existing.items_json;
      } catch {
        existing.items = [];
      }
      existing.estimated_cost = Number(existing.estimated_cost) || 0;
      existing.is_purchased = Number(existing.is_purchased || 0);

      return res.json({
        success: true,
        alreadyDrawn: true,
        message: `¡Hola ${existing.assigned_to}! Tu boleto ya está asignado.`,
        ticket: existing
      });
    }

    // 3. Select an available ticket at random (from 3 remaining available tickets)
    const availableTicket = await queryOne(`
      SELECT * FROM tickets 
      WHERE event_id = ? AND status = 'available' 
      ORDER BY RANDOM() 
      LIMIT 1
    `, [event.id]);

    if (!availableTicket) {
      return res.status(409).json({
        error: '¡Oops! Ya no quedan tickets disponibles para este sorteo. Todos los puestos han sido tomados.'
      });
    }

    // 4. Atomically assign the ticket
    const nowIso = new Date().toISOString();
    await execute(`
      UPDATE tickets 
      SET status = 'assigned', 
          assigned_to = ?, 
          assigned_phone = ?, 
          device_fingerprint = ?, 
          assigned_at = ? 
      WHERE id = ? AND status = 'available'
    `, [trimmedName, phone ? phone.trim() : null, deviceFingerprint || null, nowIso, availableTicket.id]);

    // Fetch the updated record
    const updated = await queryOne('SELECT * FROM tickets WHERE id = ?', [availableTicket.id]);
    try {
      updated.items = typeof updated.items_json === 'string' ? JSON.parse(updated.items_json) : updated.items_json;
    } catch {
      updated.items = [];
    }
    updated.estimated_cost = Number(updated.estimated_cost) || 0;
    updated.is_purchased = Number(updated.is_purchased || 0);

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
app.post('/api/lottery/release-my-ticket', async (req, res) => {
  try {
    const { deviceFingerprint, ticketId } = req.body;
    if (ticketId) {
      await execute(`
        UPDATE tickets 
        SET status = 'available', assigned_to = NULL, assigned_phone = NULL, device_fingerprint = NULL, assigned_at = NULL, is_purchased = 0, purchased_at = NULL 
        WHERE id = ?
      `, [ticketId]);
    } else if (deviceFingerprint) {
      await execute(`
        UPDATE tickets 
        SET status = 'available', assigned_to = NULL, assigned_phone = NULL, device_fingerprint = NULL, assigned_at = NULL, is_purchased = 0, purchased_at = NULL 
        WHERE device_fingerprint = ?
      `, [deviceFingerprint]);
    }
    res.json({ success: true, message: 'Ticket liberado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Participant confirms or unconfirms item purchase
app.post('/api/lottery/confirm-purchase', async (req, res) => {
  try {
    const { ticketId, purchased } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: 'ID de boleto requerido.' });
    }

    const current = await queryOne('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    if (!current) {
      return res.status(404).json({ error: 'Boleto no encontrado.' });
    }
    if (current.status !== 'assigned') {
      return res.status(400).json({ error: 'El boleto aún no ha sido asignado a ningún participante.' });
    }

    const isPurchased = purchased === false ? 0 : 1;
    const purchasedAt = isPurchased === 1 ? new Date().toISOString() : null;

    await execute(`
      UPDATE tickets 
      SET is_purchased = ?, purchased_at = ? 
      WHERE id = ?
    `, [isPurchased, purchasedAt, ticketId]);

    const updated = await queryOne('SELECT * FROM tickets WHERE id = ?', [ticketId]);
    try {
      updated.items = typeof updated.items_json === 'string' ? JSON.parse(updated.items_json) : updated.items_json;
    } catch {
      updated.items = [];
    }
    updated.estimated_cost = Number(updated.estimated_cost) || 0;
    updated.is_purchased = Number(updated.is_purchased || 0);

    res.json({
      success: true,
      is_purchased: isPurchased,
      purchased_at: purchasedAt,
      ticket: updated,
      message: isPurchased === 1 ? '¡Compra confirmada con éxito!' : 'Compra marcada como pendiente.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------- Admin Management Actions ----------------------

// Toggle purchase status directly from admin panel
app.post('/api/admin/toggle-purchase/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await queryOne('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!current) {
      return res.status(404).json({ error: 'Boleto no encontrado.' });
    }

    const newPurchased = Number(current.is_purchased || 0) === 1 ? 0 : 1;
    const purchasedAt = newPurchased === 1 ? new Date().toISOString() : null;

    await execute(`
      UPDATE tickets 
      SET is_purchased = ?, purchased_at = ? 
      WHERE id = ?
    `, [newPurchased, purchasedAt, id]);

    res.json({
      success: true,
      is_purchased: newPurchased,
      purchased_at: purchasedAt,
      message: newPurchased === 1 ? 'Marcado como comprado' : 'Marcado como pendiente'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Unassign / Release ticket
app.post('/api/admin/release-ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await execute(`
      UPDATE tickets 
      SET status = 'available', 
          assigned_to = NULL, 
          assigned_phone = NULL, 
          device_fingerprint = NULL, 
          assigned_at = NULL,
          is_purchased = 0,
          purchased_at = NULL 
      WHERE id = ?
    `, [id]);

    res.json({ success: true, message: 'Ticket liberado y disponible nuevamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual assignment by admin
app.post('/api/admin/assign-manual', async (req, res) => {
  try {
    const { ticketId, name, phone } = req.body;
    if (!ticketId || !name) {
      return res.status(400).json({ error: 'Ticket y nombre son obligatorios.' });
    }

    const nowIso = new Date().toISOString();
    await execute(`
      UPDATE tickets 
      SET status = 'assigned', 
          assigned_to = ?, 
          assigned_phone = ?, 
          assigned_at = ? 
      WHERE id = ?
    `, [name.trim(), phone ? phone.trim() : null, nowIso, ticketId]);

    res.json({ success: true, message: 'Ticket asignado manualmente con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset entire lottery (keep tickets, release assignments)
app.post('/api/admin/reset-lottery', async (req, res) => {
  try {
    const event = await queryOne('SELECT id FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    await execute(`
      UPDATE tickets 
      SET status = 'available', 
          assigned_to = NULL, 
          assigned_phone = NULL, 
          device_fingerprint = NULL, 
          assigned_at = NULL,
          is_purchased = 0,
          purchased_at = NULL 
      WHERE event_id = ?
    `, [event.id]);

    res.json({ success: true, message: 'Sorteo reiniciado. Todos los tickets están disponibles de nuevo.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export WhatsApp formatted message
app.get('/api/admin/export-summary', async (req, res) => {
  try {
    const event = await queryOne('SELECT * FROM events WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const tickets = await query('SELECT * FROM tickets WHERE event_id = ? ORDER BY category, id', [event.id]);

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
    const purchasedList = assigned.filter(t => Number(t.is_purchased) === 1);

    if (assigned.length > 0) {
      text += `👥 *PARTICIPANTES CONFIRMADOS (${assigned.length}):*\n`;
      for (const t of assigned) {
        const cost = Number(t.estimated_cost) || 0;
        totalBudget += cost;
        assignedCount++;
        const statusIcon = Number(t.is_purchased) === 1 ? '✅ [COMPRADO]' : '⏳ [PENDIENTE]';
        text += `• 👤 *${t.assigned_to}* 👉 ${t.title} (~$${cost.toFixed(2)}) ${statusIcon}\n`;
      }
      text += `\n`;
    }

    if (pending.length > 0) {
      text += `🎟️ *TICKETS AÚN DISPONIBLES (${pending.length}):*\n`;
      for (const t of pending) {
        const cost = Number(t.estimated_cost) || 0;
        text += `• 🎟️ ${t.title} (~$${cost.toFixed(2)})\n`;
      }
      text += `\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *Resumen:* ${assignedCount}/${tickets.length} boletos asignados | 🛍️ *${purchasedList.length}/${assignedCount} compras confirmadas*\n`;
    text += `💰 Presupuesto total: ~$${totalBudget.toFixed(2)}\n`;
    text += `¡Recuerden confirmar en la app cuando ya hayan comprado sus cosas! ☕🥖`;

    res.json({ 
      text, 
      totalBudget, 
      assignedCount, 
      purchasedCount: purchasedList.length,
      totalTickets: tickets.length 
    });
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
  console.log(`🚀 DesayunApp Backend escuchando en http://0.0.0.0:${PORT} [Motor: ${isPostgres ? '🐘 PostgreSQL / Neon.tech' : '💾 SQLite Local'}]`);
  const ips = getNetworkIps();
  console.log('📡 Interfaces de red disponibles:');
  ips.forEach(net => console.log(`   - ${net.interface}: http://${net.ip}:${PORT}`));
});
