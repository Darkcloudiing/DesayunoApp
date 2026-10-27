import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Coffee, Sparkles, CheckCircle2, Share2, Copy, 
  ShoppingBag, Calendar, User, ArrowRight, RefreshCw, AlertCircle, Gift
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function ParticipantDraw({ event, onSwitchToAdmin }) {
  const [step, setStep] = useState('loading'); // 'loading', 'input', 'reveal', 'ticket'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
      const savedTicketStr = localStorage.getItem('desayunapp_my_ticket');
      if (savedTicketStr) {
        try {
          const parsed = JSON.parse(savedTicketStr);
          setTicket(parsed);
          setStep('ticket');
          return;
        } catch {
          localStorage.removeItem('desayunapp_my_ticket');
        }
      }

      // Check on backend by device fingerprint
      const fp = getDeviceFingerprint();
      try {
        const res = await fetch('/api/lottery/check-my-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceFingerprint: fp })
        });
        const data = await res.json();
        if (data.found && data.ticket) {
          setTicket(data.ticket);
          localStorage.setItem('desayunapp_my_ticket', JSON.stringify(data.ticket));
          setStep('ticket');
        } else {
          setStep('input');
        }
      } catch {
        setStep('input');
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

  // 1-Tap Reveal Action
  const handleRevealComplete = () => {
    sound.playFanfare();
    triggerConfetti();
    setStep('ticket');
  };

  // Reset test on this device
  const handleResetMyTest = async () => {
    if (confirm('¿Deseas reiniciar la prueba en este teléfono para poder probar con otro nombre?')) {
      const fp = localStorage.getItem('desayunapp_device_id');
      try {
        await fetch('/api/lottery/release-my-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceFingerprint: fp, ticketId: ticket?.id })
        });
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem('desayunapp_my_ticket');
      localStorage.removeItem('desayunapp_device_id');
      setTicket(null);
      setName('');
      setPhone('');
      setStep('input');
    }
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

      {/* STEP 1: Identification & Registration */}
      {step === 'input' && (
        <div className="glass-panel" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span className="badge badge-category" style={{ marginBottom: '0.5rem' }}>
              <Sparkles size={13} /> Sorteo Oficial de 15 Boletos
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

          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
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
          
          {/* Top Bar with Status and Quick Reset Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="badge badge-available" style={{ padding: '0.4rem 0.9rem' }}>
              <CheckCircle2 size={15} /> ¡Aporte Confirmado!
            </span>
            <button
              onClick={handleResetMyTest}
              className="btn btn-secondary"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.8rem',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#FBBF24',
                border: '1px solid rgba(245, 158, 11, 0.4)'
              }}
              title="Permite sortear como otra persona"
            >
              <RefreshCw size={13} /> 🔄 Probar con otro nombre
            </button>
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

          {/* Bottom Clear & Admin Buttons */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              🔒 Tu boleto está guardado en este dispositivo.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleResetMyTest}
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.55rem 1.1rem',
                  borderRadius: '999px',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF'
                }}
              >
                <RefreshCw size={14} /> 🔄 Probar con otro nombre (Reiniciar prueba)
              </button>
              <button
                onClick={onSwitchToAdmin}
                className="btn btn-ghost"
                style={{ fontSize: '0.85rem', padding: '0.55rem 1rem' }}
              >
                ⚙️ Administrador
              </button>
            </div>
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
    <div className="ticket-boarding-pass" style={{ padding: '1.75rem 1.5rem', textAlign: 'left' }}>
      <div className="ticket-notch-left" />
      <div className="ticket-notch-right" />
      <div className="ticket-perforation" />

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
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Asignado a:
        </div>
        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <User size={18} />
          {ticket.assigned_to || 'Compañero'}
        </div>
      </div>

      {/* Main Assigned Items */}
      <div style={{ marginBottom: '1.75rem' }}>
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

      {/* Perforation section (Bottom receipt summary) */}
      <div style={{ paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
