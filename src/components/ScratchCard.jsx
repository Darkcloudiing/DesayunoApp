import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, Eye } from 'lucide-react';
import { sound } from '../utils/audio';

export default function ScratchCard({ children, onRevealed, isAlreadyRevealed = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [revealed, setRevealed] = useState(isAlreadyRevealed);
  const [isScratching, setIsScratching] = useState(false);
  const [progress, setProgress] = useState(0);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || revealed) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Draw luxury golden-bronze scratch coating
    const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grad.addColorStop(0, '#D97706'); // Warm amber
    grad.addColorStop(0.3, '#F59E0B');
    grad.addColorStop(0.5, '#FDE68A'); // Sparkle gold center
    grad.addColorStop(0.7, '#F59E0B');
    grad.addColorStop(1, '#B45309');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add textured foil pattern dots
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let x = 10; x < rect.width; x += 20) {
      for (let y = 10; y < rect.height; y += 20) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Border decorative frame
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, rect.width - 16, rect.height - 16);

    // Scratch instructions text
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 18px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ RASPA CON TU DEDO AQUÍ ✨', rect.width / 2, rect.height / 2 - 12);

    ctx.fillStyle = '#92400E';
    ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('🪙 Descubre tu misión para el desayuno', rect.width / 2, rect.height / 2 + 16);
  }, [revealed]);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  const scratch = (clientX, clientY) => {
    if (revealed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const x = (clientX - rect.left) * dpr;
    const y = (clientY - rect.top) * dpr;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28 * dpr, 0, Math.PI * 2);
    ctx.fill();

    sound.playScratchTing();
    checkProgress();
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;

    const ctx = canvas.getContext('2d');
    // Sample every 16th pixel for performance
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let clearPixels = 0;
      const totalPixels = data.length / 4;

      for (let i = 3; i < data.length; i += 64) {
        if (data[i] === 0) clearPixels++;
      }

      const percent = (clearPixels / (totalPixels / 16)) * 100;
      setProgress(Math.min(100, Math.round(percent)));

      if (percent > 40) {
        completeReveal();
      }
    } catch {
      // Ignore security errors
    }
  };

  const completeReveal = () => {
    if (revealed) return;
    setRevealed(true);
    sound.playFanfare();
    if (onRevealed) onRevealed();
  };

  // Mouse handlers
  const handleMouseDown = (e) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isScratching) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => setIsScratching(false);

  // Touch handlers for mobile phones
  const handleTouchStart = (e) => {
    setIsScratching(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isScratching) return;
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => setIsScratching(false);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '0 auto' }}>
      {/* Hidden Content underneath */}
      <div ref={containerRef} style={{ width: '100%' }}>
        {children}
      </div>

      {/* Interactive Scratch Foil Overlay */}
      {!revealed && (
        <>
          <canvas
            ref={canvasRef}
            id="scratch-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '24px',
              cursor: 'pointer',
              touchAction: 'none',
              boxShadow: '0 12px 35px rgba(245, 158, 11, 0.35)',
              zIndex: 10
            }}
          />

          {/* Quick Reveal Helper Button */}
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              onClick={completeReveal}
              className="btn btn-secondary"
              style={{
                fontSize: '0.85rem',
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#FBBF24'
              }}
            >
              <Eye size={15} />
              ¿No puedes raspar? Revelar con un clic
            </button>
          </div>
        </>
      )}
    </div>
  );
}
