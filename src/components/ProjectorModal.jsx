import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, Maximize2, Minimize2, Download, Copy, Check, 
  Wifi, Globe, Sparkles, Users, Coffee, X, Edit3
} from 'lucide-react';

export default function ProjectorModal({ event, stats, networkInfo, onClose }) {
  const isCloudHost = typeof window !== 'undefined' && 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';

  const defaultUrl = isCloudHost 
    ? window.location.origin 
    : (networkInfo?.preferredIp ? `http://${networkInfo.preferredIp}:${networkInfo.clientPort || 3000}` : window.location.origin);

  const [qrUrl, setQrUrl] = useState(defaultUrl);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!qrUrl) return;

    QRCode.toDataURL(qrUrl, {
      width: 420,
      margin: 2,
      color: {
        dark: '#0B0F19',
        light: '#FFFFFF'
      }
    })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [qrUrl]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(err => console.log(err));
      setIsFullscreen(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const link = document.createElement('a');
    link.download = `QR-Desayuno-${event?.title || 'Oficina'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const percent = stats?.total_tickets > 0 
    ? Math.round((stats.assigned_tickets / stats.total_tickets) * 100) 
    : 0;

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0B0F19',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2rem',
        overflowY: 'auto'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '16px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <Coffee size={28} color="#F97316" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.6rem', color: '#FFF' }}>
              {event?.title || 'Gran Desayuno de la Oficina'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Apunta la cámara de tu teléfono al código QR para sacar tu boleto
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={toggleFullscreen} className="btn btn-secondary" title="Pantalla Completa">
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button onClick={onClose} className="btn btn-ghost" title="Cerrar proyector">
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Center QR & Live Stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '3rem', margin: '2rem 0' }}>
        
        {/* Big High-Contrast QR Code */}
        <div style={{ textAlign: 'center' }}>
          <div 
            style={{ 
              background: '#FFFFFF', 
              padding: '1.5rem', 
              borderRadius: '28px', 
              boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(249,115,22,0.25)',
              display: 'inline-block'
            }}
          >
            {qrDataUrl && (
              <img 
                src={qrDataUrl} 
                alt="QR Code Desayuno" 
                style={{ width: '280px', height: '280px', display: 'block', borderRadius: '12px' }} 
              />
            )}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button onClick={downloadQr} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              <Download size={16} /> Descargar Imagen QR
            </button>
            <button onClick={copyUrl} className="btn btn-secondary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              {copied ? '¡URL Copiada!' : 'Copiar Enlace'}
            </button>
          </div>
        </div>

        {/* Live Attendance / Draw Progress */}
        <div style={{ maxWidth: '420px', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Users size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1.25rem' }}>Progreso del Sorteo</h3>
            </div>

            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#FBBF24', lineHeight: 1 }}>
              {stats?.assigned_tickets || 0}
              <span style={{ fontSize: '1.5rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                /{stats?.total_tickets || 15}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Compañeros con aporte asignado ({percent}%)
            </p>

            {/* Progress Bar */}
            <div style={{ height: '14px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${percent}%`, 
                  background: 'linear-gradient(90deg, #F97316 0%, #10B981 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.5s ease'
                }} 
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Boletos disponibles:</span>
                <span style={{ color: '#34D399', fontWeight: 700 }}>{stats?.available_tickets || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Presupuesto total estimado:</span>
                <span style={{ color: '#60A5FA', fontWeight: 700 }}>~${Number(stats?.total_budget || 199.16).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gasto equilibrado por persona:</span>
                <span style={{ color: '#FBBF24', fontWeight: 700 }}>~${Number(stats?.avg_cost || 13.28).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Network / Cloud Domain Configuration Bar */}
      <footer style={{ background: 'rgba(18,24,38,0.7)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isCloudHost ? (
              <span className="badge badge-available" style={{ fontSize: '0.8rem' }}>
                <Globe size={14} /> Dominio en la Nube Activo
              </span>
            ) : (
              <span className="badge badge-category" style={{ fontSize: '0.8rem' }}>
                <Wifi size={14} /> Modo Local / Wi-Fi
              </span>
            )}

            {/* Quick Switch to Local Wi-Fi if available */}
            {networkInfo?.ips && networkInfo.ips.length > 0 && (
              <select
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
                style={{
                  background: '#0F172A',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                {isCloudHost && <option value={window.location.origin}>🌐 Nube: {window.location.origin}</option>}
                {networkInfo.ips.map((net, i) => (
                  <option key={i} value={`http://${net.ip}:${networkInfo.clientPort || 3000}`}>
                    📡 Wi-Fi ({net.interface}): http://{net.ip}:{networkInfo.clientPort || 3000}
                  </option>
                ))}
                <option value="http://localhost:3000">💻 Localhost (http://localhost:3000)</option>
              </select>
            )}

            <button 
              onClick={() => setIsEditingUrl(!isEditingUrl)} 
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            >
              <Edit3 size={14} /> {isEditingUrl ? 'Ocultar' : 'Personalizar URL'}
            </button>
          </div>

          {/* URL Display or Custom Input */}
          <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', flex: 1, textAlign: 'right' }}>
            {isEditingUrl ? (
              <input
                type="text"
                className="input-field"
                value={qrUrl}
                onChange={(e) => setQrUrl(e.target.value)}
                placeholder="https://tu-app.onrender.com"
                style={{ maxWidth: '350px', display: 'inline-block', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              />
            ) : (
              <span>URL en el QR: <strong style={{ color: '#FBBF24' }}>{qrUrl}</strong></span>
            )}
          </div>

        </div>
      </footer>
    </div>
  );
}
