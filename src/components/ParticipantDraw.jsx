import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Coffee, Sparkles, CheckCircle2, Share2, Copy, 
  ShoppingBag, Calendar, User, ArrowRight, RefreshCw, AlertCircle, Gift,
  Search, Users, Dices, Smartphone, ShieldCheck, X, Check
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function ParticipantDraw({ event, stats, onRefresh, onSwitchToAdmin }) {
  const [step, setStep] = useState('loading'); // 'loading', 'input', 'reveal', 'ticket'
  const [inputMode, setInputMode] = useState('assigned'); // 'assigned' | 'new'
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState(null); // { id, name, ticketTitle, category, isLinked }
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmingPurchase, setConfirmingPurchase] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);

  // Generate or get device fingerprint
  const getDeviceFingerprint = () => {
    let fp = localStorage.getItem('desayunapp_device_id');
    if (!fp) {
      fp = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('desayunapp_device_id', fp);
    }
    return fp;
  };

  // Check if participant already has a saved ticket or if reset requested
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true' || window.location.hash === '#reset') {
      localStorage.removeItem('desayunapp_my_ticket');
      localStorage.removeItem('desayunapp_device_id');
      setTicket(null);
      setStep('input');
      return;
    }

    const checkSaved = async () => {
      let savedTicket = null;
      const savedTicketStr = localStorage.getItem('desayunapp_my_ticket');
      if (savedTicketStr) {
        try {
          savedTicket = JSON.parse(savedTicketStr);
        } catch {
          localStorage.removeItem('desayunapp_my_ticket');
        }
      }

      // Check on backend: Is this ticket or device still actively assigned?
      const fp = getDeviceFingerprint();
      try {
        const res = await fetch('/api/lottery/check-my-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            deviceFingerprint: fp,
            ticketId: savedTicket?.id 
          })
        });
        const data = await res.json();
        if (data.found && data.ticket) {
          // Ticket is confirmed and active in Neon DB
          setTicket(data.ticket);
          localStorage.setItem('desayunapp_my_ticket', JSON.stringify(data.ticket));
          setStep('ticket');
        } else {
          // Server confirmed ticket was released or not assigned: clear local storage
          localStorage.removeItem('desayunapp_my_ticket');
          setTicket(null);
          setStep('input');
        }
      } catch {
        // Fallback ONLY if server is completely offline / unreachable
        if (savedTicket) {
          setTicket(savedTicket);
          setStep('ticket');
        } else {
          setStep('input');
        }
      }
    };

    checkSaved();

    // Fetch assigned participants list for quick-autocomplete
    fetch('/api/lottery/participants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setParticipantsList(data);
      })
      .catch(() => {});
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  };

  const executeDraw = async (targetName) => {
    const candidate = targetName || name;
    if (!candidate.trim()) {
      setError('Por favor escribe tu nombre o apodo.');
      return;
    }
    setError('');
    setLoading(true);
    sound.playTap();

    try {
      const fp = getDeviceFingerprint();
      const res = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: candidate.trim(),
          phone: phone.trim(),
          deviceFingerprint: fp
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.error?.includes('disponibles')) {
          if (onRefresh) onRefresh();
        }
        throw new Error(data.error || 'No se pudo realizar el sorteo.');
      }

      setTicket(data.ticket);
      localStorage.setItem('desayunapp_my_ticket', JSON.stringify(data.ticket));

      if (data.alreadyDrawn) {
        setStep('ticket');
      } else {
        setStep('reveal');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawTicket = (e) => {
    e.preventDefault();
    executeDraw(name);
  };

  const handleSelectParticipant = (selectedName) => {
    setName(selectedName);
    executeDraw(selectedName);
  };

  const handleRecoverTicket = async (e) => {
    e.preventDefault();
    if (!recoverName.trim()) return;
    setRecoverLoading(true);
    setRecoverError('');
    try {
      const res = await fetch('/api/lottery/check-my-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recoverName.trim() })
      });
      const data = await res.json();
      if (data.found && data.ticket) {
        setTicket(data.ticket);
        localStorage.setItem('desayunapp_my_ticket', JSON.stringify(data.ticket));
        setStep('ticket');
      } else {
        setRecoverError('No encontramos ningún boleto asignado a ese nombre.');
      }
    } catch {
      setRecoverError('Error al contactar al servidor.');
    } finally {
      setRecoverLoading(false);
    }
  };

  // 1-Tap Reveal Action
  const handleRevealComplete = () => {
    sound.playFanfare();
    triggerConfetti();
    setStep('ticket');
  };

  const handleCopyAssignment = () => {
    if (!ticket) return;
    const itemsList = ticket.items ? ticket.items.map(it => `• ${it.qty} ${it.name}`).join('\n') : ticket.title;
    const text = `🍳 Mi aporte para el desayuno (${event?.title || 'Oficina'}):\n${ticket.title}\n${itemsList}\nPresupuesto estimado: ~$${ticket.estimated_cost?.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetMyTicket = () => {
    localStorage.removeItem('desayunapp_my_ticket');
    setTicket(null);
    setStep('input');
  };

  const handleShareWhatsApp = () => {
    if (!ticket) return;
    const text = encodeURIComponent(
      `¡Hola! 🥐 En el sorteo del *${event?.title || 'Desayuno de la Oficina'}* me tocó traer:\n` +
      `👉 *${ticket.title}*\n` +
      `Costo estimado: ~$${ticket.estimated_cost?.toFixed(2)}\n` +
      `¡Nos vemos para compartir! ☕`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTogglePurchase = async (targetPurchased) => {
    if (!ticket?.id) return;
    setConfirmingPurchase(true);
    sound.playTap();
    try {
      const res = await fetch('/api/lottery/confirm-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, purchased: targetPurchased })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedTicket = { 
          ...ticket, 
          is_purchased: data.is_purchased, 
          purchased_at: data.purchased_at 
        };
        setTicket(updatedTicket);
        localStorage.setItem('desayunapp_my_ticket', JSON.stringify(updatedTicket));
        if (data.is_purchased === 1) {
          triggerConfetti();
          sound.playFanfare();
        }
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'No se pudo actualizar el estado de la compra.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor: ' + err.message);
    } finally {
      setConfirmingPurchase(false);
    }
  };

  const assignedCount = participantsList.length > 0 
    ? participantsList.length 
    : (Number(stats?.assigned_tickets) || 0);
  const totalCount = Number(stats?.total_tickets) || (assignedCount + (Number(stats?.available_tickets) || 0)) || 25;
  const availableCount = stats?.available_tickets !== undefined 
    ? Number(stats.available_tickets) 
    : Math.max(0, totalCount - assignedCount);

  const isSoldOut = availableCount === 0 || (stats && Number(stats.total_tickets) > 0 && Number(stats.available_tickets) === 0);

  const cleanNorm = (str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const filteredParticipants = participantsList.filter(p => {
    if (!searchQuery.trim()) return true;
    const pNorm = cleanNorm(p.name);
    const qNorm = cleanNorm(searchQuery);
    return pNorm.includes(qNorm) || qNorm.includes(pNorm);
  });

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw className="animate-spin" size={32} color="#F97316" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1rem' }}>
      {/* Top Brand Header */}
      <header style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div 
          className="animate-float" 
          style={{ 
            display: 'inline-flex', 
            padding: '0.85rem', 
            borderRadius: '20px', 
            background: 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(245,158,11,0.1) 100%)',
            border: '1px solid rgba(249,115,22,0.3)',
            marginBottom: '0.5rem'
          }}
        >
          <Coffee size={34} color="#F97316" />
        </div>
        <h1 style={{ fontSize: '1.75rem', color: '#FFF', marginBottom: '0.2rem' }}>
          {event?.title || 'Sorteo de Desayuno 🥐☕'}
        </h1>
        {event?.target_date && (
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#FBBF24', fontSize: '0.85rem', fontWeight: '500' }}>
            <Calendar size={14} /> {event.target_date}
          </p>
        )}
      </header>

      {/* STEP 1: Identification & Selection (Options 2 & 3) */}
      {step === 'input' && (
        <div className="glass-panel" style={{ padding: '1.75rem 1.25rem', animation: 'slide-up 0.3s ease' }}>
          
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <span className="badge badge-category" style={{ marginBottom: '0.4rem' }}>
              <Sparkles size={13} /> {event?.title || 'Desayuno Oficial'} · {assignedCount} de {totalCount} Ocupados {availableCount === 0 ? '· ¡Cupos Llenos! 🎉' : `· ${availableCount} Disponible${availableCount === 1 ? '' : 's'}`}
            </span>
            <h2 style={{ fontSize: '1.35rem', marginTop: '0.2rem', color: '#FFF' }}>
              ¿Cómo deseas ingresar?
            </h2>
          </div>

          {/* Tab Selector Buttons (Option 2) */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.1fr 0.9fr', 
              gap: '0.4rem', 
              background: 'rgba(0,0,0,0.35)', 
              padding: '0.35rem', 
              borderRadius: '16px', 
              marginBottom: '1.25rem',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <button
              type="button"
              onClick={() => { setInputMode('assigned'); setError(''); }}
              style={{
                fontSize: '0.84rem',
                padding: '0.65rem 0.4rem',
                borderRadius: '12px',
                border: 'none',
                background: inputMode === 'assigned' 
                  ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' 
                  : 'transparent',
                color: inputMode === 'assigned' ? '#FFF' : 'var(--text-muted)',
                fontWeight: inputMode === 'assigned' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: inputMode === 'assigned' ? '0 4px 15px rgba(249,115,22,0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Users size={16} />
              <span>Ya estoy en la lista ({assignedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => { setInputMode('new'); setError(''); }}
              style={{
                fontSize: '0.84rem',
                padding: '0.65rem 0.4rem',
                borderRadius: '12px',
                border: 'none',
                background: inputMode === 'new' 
                  ? 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' 
                  : 'transparent',
                color: inputMode === 'new' ? '#FFF' : 'var(--text-muted)',
                fontWeight: inputMode === 'new' ? 700 : 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                cursor: 'pointer',
                boxShadow: inputMode === 'new' ? '0 4px 15px rgba(249,115,22,0.35)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <Dices size={16} />
              <span>
                {availableCount > 0 
                  ? `Nuevo Sorteo (${availableCount} cupo${availableCount === 1 ? '' : 's'})` 
                  : 'Nuevo Sorteo (0 cupos)'}
              </span>
            </button>
          </div>

          {/* TAB 1: YA ESTOY EN LA LISTA */}
          {inputMode === 'assigned' && (
            <div style={{ animation: 'fade-in 0.25s ease' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '0.85rem', textAlign: 'center' }}>
                Toca tu nombre para confirmar y vincular tu boleto a este celular ({assignedCount} participantes):
              </p>

              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="🔍 Escribe tu nombre para filtrar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '2.4rem', fontSize: '0.92rem' }}
                />
                <Search size={18} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Scrollable Participants Grid / List */}
              <div 
                style={{ 
                  maxHeight: '340px', 
                  overflowY: 'auto', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.45rem',
                  paddingRight: '4px'
                }}
              >
                {filteredParticipants.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setConfirmModal(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      gap: '0.75rem',
                      width: '100%'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(249, 115, 22, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#FFF' }}>
                        👤 {p.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#FDE68A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.15rem' }}>
                        {p.ticketTitle}
                      </div>
                    </div>

                    <div>
                      {p.isLinked ? (
                        <span 
                          className="badge" 
                          style={{ 
                            fontSize: '0.72rem', 
                            background: 'rgba(16, 185, 129, 0.15)', 
                            color: '#6EE7B7', 
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <Smartphone size={11} /> Vinculado
                        </span>
                      ) : (
                        <span 
                          className="badge" 
                          style={{ 
                            fontSize: '0.72rem', 
                            background: 'rgba(249, 115, 22, 0.18)', 
                            color: '#FDBA74', 
                            border: '1px solid rgba(249, 115, 22, 0.4)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Ver boleto 👉
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {filteredParticipants.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                      No encontramos a ningún compañero con el nombre "<strong>{searchQuery}</strong>".
                    </p>
                    <button
                      type="button"
                      onClick={() => { setInputMode('new'); setName(searchQuery); }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                    >
                      <Dices size={14} /> ¿Eres nuevo? Sortea tu boleto aquí
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: NUEVO SORTEO */}
          {inputMode === 'new' && (
            <div style={{ animation: 'fade-in 0.25s ease' }}>
              {isSoldOut ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <div 
                    style={{ 
                      display: 'inline-flex', 
                      padding: '1rem', 
                      borderRadius: '20px', 
                      background: 'rgba(239, 68, 68, 0.12)', 
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <ShoppingBag size={34} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: '#FFF', fontWeight: 700, marginBottom: '0.4rem' }}>
                    ¡Boletos Agotados para Nuevos Sorteos!
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1.25rem' }}>
                    Los {totalCount} boletos oficiales ya tienen participante asignado. Si tú ya estabas participando, selecciona tu nombre en la pestaña anterior:
                  </p>
                  <button
                    type="button"
                    onClick={() => setInputMode('assigned')}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
                  >
                    <Users size={16} /> Ver lista de los {assignedCount} participantes
                  </button>
                </div>
              ) : (
                <div>
                  <div 
                    style={{ 
                      background: 'rgba(249, 115, 22, 0.1)', 
                      border: '1px solid rgba(249, 115, 22, 0.25)', 
                      borderRadius: '12px', 
                      padding: '0.75rem 1rem', 
                      marginBottom: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}
                  >
                    <Sparkles size={18} color="#F97316" style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: '0.85rem', color: '#FED7AA' }}>
                      Quedan <strong>{availableCount} boleto{availableCount === 1 ? '' : 's'} disponible{availableCount === 1 ? '' : 's'}</strong>
                      {stats?.avg_cost ? ` equilibrados en costo (~$${Number(stats.avg_cost).toFixed(2)})` : ''}.
                    </div>
                  </div>

                  <form onSubmit={handleDrawTicket}>
                    <div style={{ marginBottom: '1.15rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Tu Nombre y Apellido *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ej. Pedro Pérez"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          autoFocus
                          required
                        />
                        <User size={18} color="var(--text-dim)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                        Teléfono / WhatsApp (Opcional)
                      </label>
                      <input
                        type="tel"
                        className="input-field"
                        placeholder="Ej. +58 412 1234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    {error && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#FDA4AF', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.9rem', fontSize: '1.02rem', fontWeight: 700 }}
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          Sorteando tu boleto...
                        </>
                      ) : (
                        <>
                          <Dices size={18} />
                          ¡Girar Ruleta y Sacar Boleto!
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Bottom link to Admin */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <button 
              onClick={onSwitchToAdmin}
              className="btn btn-ghost" 
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', color: 'var(--text-dim)' }}
            >
              ⚙️ ¿Eres el Administrador? Entrar al panel
            </button>
          </div>
        </div>
      )}

      {/* OPTION 3: CONFIRMATION MODAL */}
      {confirmModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
            animation: 'fade-in 0.2s ease'
          }}
        >
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '1.75rem',
              textAlign: 'center',
              border: '1px solid rgba(249,115,22,0.4)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'slide-up 0.25s ease'
            }}
          >
            <div 
              style={{
                display: 'inline-flex',
                padding: '0.9rem',
                borderRadius: '50%',
                background: 'rgba(249,115,22,0.15)',
                border: '1px solid rgba(249,115,22,0.35)',
                color: '#F97316',
                marginBottom: '0.85rem'
              }}
            >
              <ShieldCheck size={36} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFF', marginBottom: '0.3rem' }}>
              ¿Confirmas que eres {confirmModal.name}?
            </h3>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Este teléfono quedará vinculado a tu boleto oficial para que consultes tu aporte y confirmes tu compra.
            </p>

            {/* Ticket preview card */}
            <div 
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                padding: '0.95rem',
                marginBottom: '1.35rem',
                textAlign: 'left'
              }}
            >
              <span 
                className="badge badge-category" 
                style={{ fontSize: '0.72rem', marginBottom: '0.35rem', display: 'inline-block' }}
              >
                {confirmModal.category || 'Aporte Asignado'}
              </span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#FBBF24', lineHeight: '1.4' }}>
                🥖 {confirmModal.ticketTitle}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  const target = confirmModal.name;
                  setConfirmModal(null);
                  executeDraw(target);
                }}
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : `✅ Sí, soy yo — Ver Mi Boleto`}
              </button>

              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={loading}
                className="btn btn-ghost"
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}
              >
                ❌ No soy yo, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: TAP-TO-REVEAL LUXURY CARD (Instant 1-Tap Reveal) */}
      {step === 'reveal' && ticket && (
        <div style={{ textAlign: 'center', animation: 'slide-up 0.3s ease' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <span className="badge badge-assigned" style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}>
              🎉 ¡Boleto reservado para {ticket.assigned_to}!
            </span>
          </div>

          {/* Interactive Golden Tap Card */}
          <div 
            onClick={handleRevealComplete}
            className="animate-pulse-glow"
            style={{ 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #D97706 0%, #F59E0B 40%, #FEF08A 70%, #B45309 100%)',
              borderRadius: '28px',
              padding: '3rem 1.5rem',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(245, 158, 11, 0.45), 0 0 30px rgba(254, 240, 138, 0.3)',
              border: '2px solid rgba(255, 255, 255, 0.7)',
              transition: 'transform 0.15s ease',
              userSelect: 'none'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '0.5rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.2))' }}>
              🎁
            </div>
            
            <h2 style={{ fontSize: '1.65rem', color: '#78350F', fontWeight: 900, marginBottom: '0.35rem', letterSpacing: '-0.01em' }}>
              ¡TOCA AQUÍ PARA ABRIR!
            </h2>
            
            <p style={{ color: '#92400E', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              ✨ Toca con tu dedo para descubrir tu aporte del desayuno
            </p>

            <button
              onClick={handleRevealComplete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#78350F',
                color: '#FEF3C7',
                border: 'none',
                padding: '0.8rem 1.6rem',
                borderRadius: '999px',
                fontSize: '1rem',
                fontWeight: 700,
                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={18} />
              Revelar mi Aporte
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Final Boarding-Pass Ticket View */}
      {step === 'ticket' && ticket && (
        <div style={{ animation: 'slide-up 0.4s ease' }}>
          
          {/* Top Bar with Status */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <span className="badge badge-available" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> ¡Tu Aporte está Confirmado!
            </span>
          </div>

          {/* Ticket Card Component */}
          <TicketCard ticket={ticket} event={event} />

          {/* Purchase Notice & Interactive Confirmation Card */}
          <div 
            style={{
              background: ticket.is_purchased === 1 
                ? 'linear-gradient(135deg, rgba(16,185,129,0.18) 0%, rgba(5,150,105,0.22) 100%)' 
                : 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.18) 100%)',
              border: ticket.is_purchased === 1 ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(245,158,11,0.4)',
              borderRadius: '18px',
              padding: '1.25rem',
              marginTop: '1.25rem',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            {ticket.is_purchased === 1 ? (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#34D399', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={20} /> ¡Compra Notificada al Organizador!
                </div>
                <p style={{ color: '#E2E8F0', fontSize: '0.88rem', margin: '0 0 0.75rem 0' }}>
                  Confirmaste que ya tienes tus productos listos. ¡Muchas gracias por colaborar para el desayuno! 🎉
                </p>
                <button
                  type="button"
                  onClick={() => handleTogglePurchase(false)}
                  disabled={confirmingPurchase}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'underline', padding: '0.3rem 0.6rem' }}
                >
                  {confirmingPurchase ? 'Actualizando...' : '¿Aún no has comprado? Desmarcar compra'}
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#FBBF24', fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                  <ShoppingBag size={20} /> ¿Ya compraste tus cosas?
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 1rem 0' }}>
                  📢 <strong>Aviso:</strong> Cuando compres o tengas listos tus productos, presiona el botón verde para avisar al organizador en el panel administrativo.
                </p>
                <button
                  type="button"
                  onClick={() => handleTogglePurchase(true)}
                  disabled={confirmingPurchase}
                  className="btn btn-primary"
                  style={{ 
                    width: '100%', 
                    padding: '0.85rem 1.2rem', 
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 6px 20px rgba(16,185,129,0.35)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {confirmingPurchase ? (
                    <>
                      <RefreshCw className="animate-spin" size={18} /> Guardando confirmación...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={19} /> ¡Ya compré las cosas!
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Actions Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              onClick={handleShareWhatsApp}
              className="btn btn-success"
              style={{ padding: '0.8rem' }}
            >
              <Share2 size={18} />
              Enviar a WhatsApp
            </button>

            <button
              onClick={handleCopyAssignment}
              className="btn btn-secondary"
              style={{ padding: '0.8rem' }}
            >
              <Copy size={18} />
              {copied ? '¡Copiado!' : 'Copiar Aporte'}
            </button>
          </div>

          {/* Bottom Actions: Switch / Release & Admin */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button
              onClick={handleResetMyTicket}
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.35rem 0.8rem', color: '#FDA4AF' }}
            >
              🔄 ¿Boleto liberado o cambiar? Salir de este boleto
            </button>
            <button
              onClick={onSwitchToAdmin}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', color: 'var(--text-dim)' }}
            >
              ⚙️ Administrador
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Ticket Card Design
function TicketCard({ ticket, event }) {
  const items = ticket.items || [];

  return (
    <div className="ticket-boarding-pass">
      {/* 1. Top Section */}
      <div className="ticket-top-section">
        {/* Ticket Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 700 }}>
              BOLETO DE DESAYUNO OFICIAL
            </span>
            <h3 style={{ fontSize: '1.2rem', color: '#FFF' }}>
              {event?.title || 'Desayuno de la Oficina'}
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
            <span className="badge badge-category">
              {ticket.category || 'General'}
            </span>
            {ticket.is_purchased === 1 ? (
              <span className="badge badge-available" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                ✅ Ya Comprado
              </span>
            ) : (
              <span className="badge" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: 'rgba(245,158,11,0.15)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.3)' }}>
                ⏳ Por Comprar
              </span>
            )}
          </div>
        </div>

        {/* Beneficiary Name */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Asignado a:
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={18} />
            {ticket.assigned_to || 'Compañero'}
          </div>
        </div>

        {/* Main Assigned Items */}
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShoppingBag size={16} color="var(--primary)" />
            TU APORTE PARA EL DESAYUNO:
          </div>

          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '14px', padding: '1rem' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF', marginBottom: '0.5rem' }}>
              {ticket.title}
            </div>

            {items.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {items.map((it, idx) => (
                  <li key={idx} style={{ fontSize: '0.9rem', color: '#E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>👉 {it.qty} {it.name}</span>
                    {it.cost && (
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>~${Number(it.cost).toFixed(2)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {ticket.notes && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(249,115,22,0.2)', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                💡 Nota: {ticket.notes}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Pixel-Perfect Perforation Divider Row */}
      <div className="ticket-divider-row">
        <div className="ticket-notch-left" />
        <div className="ticket-dashed-line" />
        <div className="ticket-notch-right" />
      </div>

      {/* 3. Bottom Section */}
      <div className="ticket-bottom-section">
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Gasto Equilibrado:
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#34D399' }}>
            ~${ticket.estimated_cost ? Number(ticket.estimated_cost).toFixed(2) : '0.00'}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Ticket ID: #{ticket.id}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            {ticket.assigned_at ? new Date(ticket.assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Confirmado'}
          </div>
        </div>
      </div>
    </div>
  );
}
