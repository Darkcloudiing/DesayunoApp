import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Coffee, Sparkles, CheckCircle2, Share2, Copy, 
  ShoppingBag, Calendar, User, ArrowRight, RefreshCw, AlertCircle, Gift
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function ParticipantDraw({ event, stats, onRefresh, onSwitchToAdmin }) {
  const [step, setStep] = useState('loading'); // 'loading', 'input', 'reveal', 'ticket'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverName, setRecoverName] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);

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
          // Ticket is confirmed and active
          setTicket(data.ticket);
          localStorage.setItem('desayunapp_my_ticket', JSON.stringify(data.ticket));
          setStep('ticket');
        } else {
          // Admin released the ticket or reset the lottery! Clean phone memory
          localStorage.removeItem('desayunapp_my_ticket');
          setTicket(null);
          setStep('input');
        }
      } catch {
        // Fallback only if server unreachable
        if (savedTicket) {
          setTicket(savedTicket);
          setStep('ticket');
        } else {
          setStep('input');
        }
      }
    };

    checkSaved();
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

  const handleDrawTicket = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
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
          name: name.trim(),
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

  const isSoldOut = Boolean(
    stats && 
    Number(stats.total_tickets) > 0 && 
    Number(stats.available_tickets) === 0
  );

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

      {/* STEP 1A: TICKETS AGOTADOS */}
      {step === 'input' && isSoldOut && (
        <div className="glass-panel" style={{ padding: '2.25rem 1.5rem', textAlign: 'center', animation: 'slide-up 0.3s ease' }}>
          <div 
            style={{ 
              display: 'inline-flex', 
              padding: '1.2rem', 
              borderRadius: '24px', 
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              marginBottom: '1rem'
            }}
          >
            <ShoppingBag size={42} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <span 
              className="badge" 
              style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#FCA5A5', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.4rem 0.9rem',
                fontSize: '0.85rem'
              }}
            >
              🎟️ Boletos Agotados (0/{stats.total_tickets} disponibles)
            </span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFF', marginBottom: '0.6rem' }}>
            ¡Todos los Boletos están Sorteados!
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
            Todos los puestos para este desayuno ya tienen participante asignado.
          </p>

          <div 
            style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              borderRadius: '14px', 
              padding: '1rem', 
              marginBottom: '1.5rem',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
              <Sparkles size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.88rem', color: '#FEF3C7', lineHeight: '1.4' }}>
                <strong>¿Quieres participar?</strong>
                <p style={{ marginTop: '0.25rem', color: '#FDE68A', margin: 0 }}>
                  Avísale al organizador para que agregue un nuevo boleto para ti en el panel de administración.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setChecking(true);
              if (onRefresh) await onRefresh();
              setTimeout(() => setChecking(false), 500);
            }}
            disabled={checking}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginBottom: '1.25rem' }}
          >
            <RefreshCw className={checking ? 'animate-spin' : ''} size={18} />
            {checking ? 'Verificando disponibilidad...' : '🔄 Comprobar Si Ya Agregaron Tu Boleto'}
          </button>

          {/* Section: Recover existing ticket if user already had one */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            {!showRecover ? (
              <button
                type="button"
                onClick={() => setShowRecover(true)}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.4rem 0.8rem' }}
              >
                🔍 ¿Ya habías sacado tu boleto? Verificar con mi nombre
              </button>
            ) : (
              <form onSubmit={handleRecoverTicket} style={{ animation: 'slide-up 0.2s ease', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Ingresa tu nombre tal como lo escribiste al participar:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Samuel Zerpa"
                    value={recoverName}
                    onChange={(e) => setRecoverName(e.target.value)}
                    style={{ fontSize: '0.9rem', padding: '0.6rem 0.8rem' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                  >
                    {recoverLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Buscar'}
                  </button>
                </div>
                {recoverError && (
                  <p style={{ color: '#FDA4AF', fontSize: '0.8rem', margin: '0.3rem 0 0 0' }}>
                    {recoverError}
                  </p>
                )}
              </form>
            )}
          </div>

          <div style={{ marginTop: '1.25rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            <button 
              onClick={onSwitchToAdmin}
              className="btn btn-ghost" 
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              ⚙️ ¿Eres el Administrador? Entrar al panel
            </button>
          </div>
        </div>
      )}

      {/* STEP 1B: Identification & Registration */}
      {step === 'input' && !isSoldOut && (
        <div className="glass-panel" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="badge badge-category" style={{ marginBottom: '0.5rem' }}>
              <Sparkles size={13} /> Sorteo Oficial ({stats?.total_tickets || 15} Boletos · {stats?.available_tickets ?? '?'} Disponibles)
            </span>
            <h2 style={{ fontSize: '1.35rem', marginTop: '0.3rem' }}>
              ¿Quién va a participar?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
              Ingresa tu nombre para sacar tu boleto sorpresa. Todos los boletos están equilibrados en costo (~$13.28).
            </p>
          </div>

          <form onSubmit={handleDrawTicket}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Tu Nombre y Apellido *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej. Samuel Zerpa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
                <User size={18} color="var(--text-dim)" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
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
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Buscando tu boleto...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  ¡Sacar Mi Boleto Sorpresa!
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Section: Recover existing ticket if user already had one */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1.25rem', textAlign: 'center' }}>
            {!showRecover ? (
              <button
                type="button"
                onClick={() => setShowRecover(true)}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.4rem 0.8rem' }}
              >
                🔍 ¿Ya habías sacado tu boleto? Verificar con mi nombre
              </button>
            ) : (
              <form onSubmit={handleRecoverTicket} style={{ animation: 'slide-up 0.2s ease', marginTop: '0.5rem', textAlign: 'left' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  Ingresa tu nombre tal como lo escribiste al participar:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Samuel Zerpa"
                    value={recoverName}
                    onChange={(e) => setRecoverName(e.target.value)}
                    style={{ fontSize: '0.9rem', padding: '0.6rem 0.8rem' }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="btn btn-secondary"
                    style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap', fontSize: '0.85rem' }}
                  >
                    {recoverLoading ? <RefreshCw className="animate-spin" size={16} /> : 'Buscar'}
                  </button>
                </div>
                {recoverError && (
                  <p style={{ color: '#FDA4AF', fontSize: '0.8rem', margin: '0.3rem 0 0 0' }}>
                    {recoverError}
                  </p>
                )}
              </form>
            )}
          </div>

          <div style={{ marginTop: '1rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
            <button 
              onClick={onSwitchToAdmin}
              className="btn btn-ghost" 
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
            >
              ⚙️ ¿Eres el Administrador? Entrar al panel
            </button>
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

          {/* Admin link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={onSwitchToAdmin}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
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
          <span className="badge badge-category">
            {ticket.category || 'General'}
          </span>
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
