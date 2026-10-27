import React, { useState, useEffect } from 'react';
import { 
  Users, Ticket, Scale, Share2, Settings, QrCode, Plus, 
  Trash2, RefreshCw, CheckCircle2, AlertCircle, Copy, Check,
  Edit2, UserPlus, Sparkles, DollarSign, LogOut, Coffee, ShoppingBag
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function AdminPanel({ event, stats, networkInfo, onRefresh, onOpenProjector, onSwitchToParticipant }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinError, setPinError] = useState('');
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets', 'balancer', 'whatsapp', 'settings'

  // Data states
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'available', 'assigned'

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualAssignModal, setShowManualAssignModal] = useState(null); // ticket
  const [showEditEventModal, setShowEditEventModal] = useState(false);

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCost, setNewCost] = useState('4.00');
  const [newCategory, setNewCategory] = useState('Ingrediente');
  const [newNotes, setNewNotes] = useState('');

  // Manual Assign Form State
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');

  // Smart Balancer Form State
  const [balancerItems, setBalancerItems] = useState([
    { name: 'Harina de Maíz (1kg)', qty: '2 pqtes', cost: 3.20, category: 'Base' },
    { name: 'Mantequilla 250g', qty: '1 barra', cost: 1.50, category: 'Acompañamiento' },
    { name: 'Queso Blanco Llanero', qty: '500g', cost: 4.50, category: 'Proteína' },
    { name: 'Huevos frescos', qty: '15 unidades', cost: 3.50, category: 'Proteína' },
    { name: 'Jamón rebanado', qty: '400g', cost: 4.20, category: 'Proteína' },
    { name: 'Tomates y Cebollas', qty: '1.5 kg', cost: 3.00, category: 'Vegetales' },
    { name: 'Aguacates maduros', qty: '3 unidades', cost: 4.50, category: 'Vegetales' },
    { name: 'Café molido y Azúcar', qty: '250g + 500g', cost: 4.20, category: 'Bebidas' },
    { name: 'Leche líquida y Jugo', qty: '2L + 1L', cost: 4.50, category: 'Bebidas' },
    { name: 'Platos y Servilletas', qty: 'Desechables', cost: 3.80, category: 'Desechables' }
  ]);
  const [targetParticipants, setTargetParticipants] = useState(8);
  const [balancedPreview, setBalancedPreview] = useState(null);

  // WhatsApp export state
  const [exportText, setExportText] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);

  // Check session PIN
  useEffect(() => {
    const savedPin = sessionStorage.getItem('desayunapp_admin_auth');
    if (savedPin === 'true') {
      setIsAuthenticated(true);
      fetchTickets();
    }
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setPinError('');
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (res.ok && data.authorized) {
        setIsAuthenticated(true);
        sessionStorage.setItem('desayunapp_admin_auth', 'true');
        sound.playFanfare();
        fetchTickets();
      } else {
        setPinError(data.error || 'PIN incorrecto. Intenta nuevamente.');
      }
    } catch {
      setPinError('Error al contactar con el servidor');
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          estimated_cost: Number(newCost),
          category: newCategory,
          notes: newNotes,
          items: [{ name: newTitle, qty: '1 unidad', cost: Number(newCost) }]
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewCost('4.00');
        setNewNotes('');
        fetchTickets();
        onRefresh();
      }
    } catch (err) {
      alert('Error creando ticket: ' + err.message);
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este ticket?')) return;
    try {
      await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      fetchTickets();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReleaseTicket = async (id) => {
    try {
      await fetch(`/api/admin/release-ticket/${id}`, { method: 'POST' });
      fetchTickets();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePurchase = async (id) => {
    try {
      const res = await fetch(`/api/admin/toggle-purchase/${id}`, { method: 'POST' });
      if (res.ok) {
        sound.playTap();
        fetchTickets();
        onRefresh();
      }
    } catch (err) {
      alert('Error al actualizar compra: ' + err.message);
    }
  };

  const handleManualAssign = async (e) => {
    e.preventDefault();
    if (!showManualAssignModal || !manualName) return;

    try {
      await fetch('/api/admin/assign-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: showManualAssignModal.id,
          name: manualName,
          phone: manualPhone
        })
      });
      setShowManualAssignModal(null);
      setManualName('');
      setManualPhone('');
      fetchTickets();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetLottery = async () => {
    if (!confirm('⚠️ ¿Estás seguro de reiniciar el sorteo? Todos los tickets volverán a estar disponibles y los participantes deberán sortear de nuevo.')) {
      return;
    }
    try {
      await fetch('/api/admin/reset-lottery', { method: 'POST' });
      fetchTickets();
      onRefresh();
      alert('Sorteo reiniciado exitosamente.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLoadPreset = async (presetKey) => {
    if (!confirm('¿Cargar este menú temático? Reemplazará los tickets actuales.')) return;
    try {
      const res = await fetch('/api/tickets/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetKey, replaceExisting: true })
      });
      if (res.ok) {
        fetchTickets();
        onRefresh();
        alert('¡Menú temático cargado y equilibrado con éxito!');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Run Smart Balancer
  const handleRunBalancer = () => {
    const total = balancerItems.reduce((acc, it) => acc + (Number(it.cost) || 0), 0);
    const avg = total / targetParticipants;

    // Simulate balanced buckets preview
    fetch('/api/tickets/auto-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: balancerItems,
        participantCount: targetParticipants,
        replaceExisting: false
      })
    })
      .then(res => res.json())
      .then(data => {
        setBalancedPreview(data.tickets);
      })
      .catch(console.error);
  };

  const handleApplyBalancerToDb = async () => {
    if (!confirm(`¿Deseas reemplazar todos los tickets con estos ${balancedPreview?.length || targetParticipants} combos equilibrados?`)) return;
    try {
      const res = await fetch('/api/tickets/auto-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: balancerItems,
          participantCount: targetParticipants,
          replaceExisting: true
        })
      });
      if (res.ok) {
        fetchTickets();
        onRefresh();
        setActiveTab('tickets');
        alert('¡Tickets balanceados guardados en la base de datos!');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // WhatsApp Summary
  const handleFetchExport = async () => {
    try {
      const res = await fetch('/api/admin/export-summary');
      const data = await res.json();
      setExportText(data.text);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'whatsapp') {
      handleFetchExport();
    }
  }, [activeTab]);

  const copyWhatsApp = () => {
    navigator.clipboard.writeText(exportText);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // ---------------- AUTH SCREEN ----------------
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '4rem auto', padding: '1rem' }}>
        <div className="glass-panel" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(249,115,22,0.15)', marginBottom: '1rem' }}>
            <Settings size={36} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Acceso de Administrador</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Ingresa tu PIN secreto para gestionar los boletos y el sorteo.
          </p>

          <form onSubmit={handleAuth}>
            <input
              type="password"
              className="input-field"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={8}
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em', marginBottom: '1rem' }}
              autoFocus
            />

            {pinError && (
              <div style={{ color: '#FDA4AF', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {pinError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              Entrar al Panel
            </button>
          </form>

          <button
            onClick={onSwitchToParticipant}
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem', marginTop: '1.25rem' }}
          >
            ← Volver a la pantalla de sorteo
          </button>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED ADMIN PANEL ----------------
  const filteredTickets = tickets.filter(t => {
    if (filter === 'available') return t.status === 'available';
    if (filter === 'assigned') return t.status === 'assigned';
    if (filter === 'purchased') return t.status === 'assigned' && t.is_purchased === 1;
    if (filter === 'pending_purchase') return t.status === 'assigned' && t.is_purchased !== 1;
    return true;
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Top Bar Navigation */}
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '16px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <Coffee size={24} color="#F97316" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', color: '#FFF' }}>
              Panel de Control: {event?.title}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Administra boletos, balancea costos y proyecta el QR
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={onOpenProjector} className="btn btn-primary" style={{ padding: '0.6rem 1rem' }}>
            <QrCode size={18} /> Proyector & QR
          </button>
          <button onClick={onSwitchToParticipant} className="btn btn-secondary" style={{ padding: '0.6rem 1rem' }}>
            📱 Modo Teléfono
          </button>
          <button 
            onClick={() => {
              sessionStorage.removeItem('desayunapp_admin_auth');
              setIsAuthenticated(false);
            }} 
            className="btn btn-ghost" 
            title="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Stats Summary Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Boletos</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFF', marginTop: '0.2rem' }}>
            {stats?.total_tickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Creados en el sistema</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Asignados</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FBBF24', marginTop: '0.2rem' }}>
            {stats?.assigned_tickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#34D399' }}>
            {stats?.total_tickets ? `${Math.round((stats.assigned_tickets / stats.total_tickets) * 100)}% de asistencia` : '0%'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Compras Listas</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#34D399', marginTop: '0.2rem' }}>
            {stats?.purchased_tickets ?? tickets.filter(t => t.status === 'assigned' && t.is_purchased === 1).length} / {stats?.assigned_tickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {stats?.assigned_tickets ? `${Math.round(((stats?.purchased_tickets ?? tickets.filter(t => t.status === 'assigned' && t.is_purchased === 1).length) / stats.assigned_tickets) * 100)}% confirmadas` : '0%'}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Disponibles</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60A5FA', marginTop: '0.2rem' }}>
            {stats?.available_tickets || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Listos para sortear</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>Presupuesto Total</div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#A78BFA', marginTop: '0.2rem' }}>
            ~${Number(stats?.total_budget || 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Promedio: ~${Number(stats?.avg_cost || 0).toFixed(2)} / persona
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '1.5rem', gap: '0.5rem', overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}
        >
          <Ticket size={18} /> Boletos y Participantes ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`btn ${activeTab === 'whatsapp' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}
        >
          <Share2 size={18} /> Exportar WhatsApp
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}
        >
          <Settings size={18} /> Ajustes
        </button>
      </div>

      {/* ==================== TAB 1: TICKETS LIST ==================== */}
      {activeTab === 'tickets' && (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <button 
                onClick={() => setFilter('all')} 
                className={`btn ${filter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                Todos ({tickets.length})
              </button>
              <button 
                onClick={() => setFilter('available')} 
                className={`btn ${filter === 'available' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                Disponibles ({stats?.available_tickets || 0})
              </button>
              <button 
                onClick={() => setFilter('assigned')} 
                className={`btn ${filter === 'assigned' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
              >
                Asignados ({stats?.assigned_tickets || 0})
              </button>
              <button 
                onClick={() => setFilter('purchased')} 
                className={`btn ${filter === 'purchased' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: filter === 'purchased' ? '#34D399' : undefined }}
              >
                ✅ Ya Compraron ({tickets.filter(t => t.status === 'assigned' && t.is_purchased === 1).length})
              </button>
              <button 
                onClick={() => setFilter('pending_purchase')} 
                className={`btn ${filter === 'pending_purchase' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: filter === 'pending_purchase' ? '#FBBF24' : undefined }}
              >
                ⏳ Por Comprar ({tickets.filter(t => t.status === 'assigned' && t.is_purchased !== 1).length})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                <Plus size={16} /> Crear Boleto Manual
              </button>
              <button onClick={fetchTickets} className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Recargar">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Tickets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredTickets.map(t => (
              <div 
                key={t.id} 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem',
                  borderLeft: t.status === 'assigned' 
                    ? (t.is_purchased === 1 ? '4px solid #10B981' : '4px solid #F59E0B') 
                    : '4px solid #60A5FA'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${t.status === 'assigned' ? 'badge-assigned' : 'badge-available'}`}>
                      {t.status === 'assigned' ? 'Asignado' : 'Disponible'}
                    </span>
                    {t.status === 'assigned' && (
                      t.is_purchased === 1 ? (
                        <span className="badge badge-available" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> Ya Compró
                        </span>
                      ) : (
                        <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(245,158,11,0.18)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShoppingBag size={12} /> Por Comprar
                        </span>
                      )
                    )}
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34D399' }}>
                    ~${Number(t.estimated_cost).toFixed(2)}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.1rem', color: '#FFF', marginBottom: '0.4rem' }}>
                  {t.title}
                </h3>

                {t.items && t.items.length > 0 && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    {t.items.map((it, idx) => (
                      <div key={idx}>• {it.qty} {it.name}</div>
                    ))}
                  </div>
                )}

                {/* Assignment Details */}
                {t.status === 'assigned' ? (
                  <div style={{ 
                    background: t.is_purchased === 1 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', 
                    padding: '0.65rem 0.85rem', 
                    borderRadius: '10px', 
                    border: t.is_purchased === 1 ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(245,158,11,0.2)', 
                    marginBottom: '0.75rem' 
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Asignado a:</div>
                      {t.is_purchased === 1 ? (
                        <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>
                          ✅ Ya compró las cosas
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#FBBF24', fontWeight: 700 }}>
                          ⏳ Pendiente de compra
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: t.is_purchased === 1 ? '#34D399' : '#FBBF24', fontSize: '1rem', marginTop: '0.2rem' }}>
                      👤 {t.assigned_to}
                    </div>
                    {t.assigned_phone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        📞 {t.assigned_phone}
                      </div>
                    )}
                    {t.purchased_at && (
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                        🕒 Confirmado: {new Date(t.purchased_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(t.purchased_at).toLocaleDateString()})
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                    Esperando a ser sorteado...
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                  {t.status === 'assigned' && (
                    <button
                      type="button"
                      onClick={() => handleTogglePurchase(t.id)}
                      className="btn btn-ghost"
                      style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.35rem 0.65rem',
                        color: t.is_purchased === 1 ? '#34D399' : '#FBBF24',
                        background: t.is_purchased === 1 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'
                      }}
                      title={t.is_purchased === 1 ? 'Desmarcar compra' : 'Marcar como comprado'}
                    >
                      {t.is_purchased === 1 ? '↩️ Desmarcar' : '✅ Marcar comprado'}
                    </button>
                  )}

                  {t.status === 'assigned' ? (
                    <button 
                      onClick={() => handleReleaseTicket(t.id)} 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                      title="Liberar ticket para que vuelva a estar disponible"
                    >
                      🔄 Liberar
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowManualAssignModal(t)} 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                      title="Asignar a un compañero manualmente"
                    >
                      <UserPlus size={14} /> Asignar a Mano
                    </button>
                  )}

                  <button 
                    onClick={() => handleDeleteTicket(t.id)} 
                    className="btn btn-danger" 
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
                    title="Eliminar ticket"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredTickets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
              No se encontraron boletos en esta categoría.
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: WHATSAPP EXPORTER ==================== */}
      {activeTab === 'whatsapp' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="badge badge-category" style={{ marginBottom: '0.5rem' }}>
              <Share2 size={13} /> Compartir con el Equipo
            </span>
            <h2 style={{ fontSize: '1.4rem' }}>Resumen Listo para WhatsApp / Slack</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Copia este mensaje con emojis y pégalo directo en el grupo de la oficina:
            </p>
          </div>

          <textarea
            readOnly
            className="input-field"
            value={exportText}
            rows={12}
            style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '1.25rem', whiteSpace: 'pre-wrap' }}
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={copyWhatsApp}
              className="btn btn-success"
              style={{ flex: 1, padding: '0.85rem' }}
            >
              {copiedExport ? <Check size={18} /> : <Copy size={18} />}
              {copiedExport ? '¡Copiado al Portapapeles!' : 'Copiar Texto para WhatsApp'}
            </button>
            <button
              onClick={handleFetchExport}
              className="btn btn-secondary"
              style={{ padding: '0.85rem' }}
            >
              <RefreshCw size={18} /> Actualizar
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SETTINGS ==================== */}
      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.35rem', marginBottom: '1rem' }}>Ajustes del Desayuno</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Título del Evento:
              </label>
              <input
                type="text"
                className="input-field"
                defaultValue={event?.title}
                id="event-title-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Fecha del Desayuno:
              </label>
              <input
                type="date"
                className="input-field"
                defaultValue={event?.target_date}
                id="event-date-input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                PIN de Administrador:
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Ingresar nuevo PIN"
                id="event-pin-input"
              />
            </div>

            <button
              onClick={async () => {
                const title = document.getElementById('event-title-input').value;
                const date = document.getElementById('event-date-input').value;
                const pin = document.getElementById('event-pin-input').value;
                await fetch('/api/event', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ title, target_date: date, admin_pin: pin })
                });
                onRefresh();
                alert('Ajustes guardados correctamente.');
              }}
              className="btn btn-primary"
              style={{ padding: '0.8rem' }}
            >
              Guardar Cambios
            </button>

            {/* Danger Zone */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem', marginTop: '1rem' }}>
              <h4 style={{ color: '#FDA4AF', fontSize: '1rem', marginBottom: '0.4rem' }}>Zona de Peligro</h4>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                Si deseas volver a realizar el sorteo desde cero (desasignar a todos los compañeros y dejar los boletos libres):
              </p>
              <button
                onClick={handleResetLottery}
                className="btn btn-danger"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                ⚠️ Reiniciar Sorteo (Liberar todos los tickets)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MANUAL TICKET */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Crear Boleto Manual</h3>
            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Título del Aporte (ej. 2 Harinas PAN + Queso)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Costo Estimado ($)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Categoría
                  </label>
                  <select
                    className="input-field"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Ingrediente">Ingrediente</option>
                    <option value="Proteína">Proteína</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Vegetales">Vegetales</option>
                    <option value="Desechables">Desechables</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Instrucciones o notas adicionales
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej. Traer antes de las 8:30 AM"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Guardar Boleto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL ASSIGN TICKET */}
      {showManualAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Asignar Boleto a Mano</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Asigna <strong>"{showManualAssignModal.title}"</strong> a un compañero que no tenga teléfono:
            </p>

            <form onSubmit={handleManualAssign}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Nombre del Compañero *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej. Pedro Gómez"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  className="input-field"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setShowManualAssignModal(null)} className="btn btn-ghost">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
