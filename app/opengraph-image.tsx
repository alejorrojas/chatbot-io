import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Simplex — Programación Lineal paso a paso';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          backgroundImage: 'radial-gradient(circle, #d4d4d8 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Bottom fade — softens dot grid like the landing page */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '280px',
            background: 'linear-gradient(to bottom, transparent, #ffffff)',
            display: 'flex',
          }}
        />
        {/* Right fade */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '200px',
            background: 'linear-gradient(to right, transparent, #ffffff)',
            display: 'flex',
          }}
        />

        {/* Top: badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#ffffff',
            border: '1.5px solid #e4e4e7',
            borderRadius: '999px',
            padding: '8px 18px',
            width: 'fit-content',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
            }}
          />
          <span
            style={{
              fontSize: '16px',
              color: '#71717a',
              fontFamily: 'monospace',
              letterSpacing: '0.06em',
            }}
          >
            Método Simplex · Paso a paso
          </span>
        </div>

        {/* Center: hero heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '-20px' }}>
          <span
            style={{
              fontSize: '128px',
              fontWeight: 900,
              color: '#09090b',
              lineHeight: '0.88',
              fontFamily: 'monospace',
              letterSpacing: '-0.03em',
            }}
          >
            Programación
          </span>
          <span
            style={{
              fontSize: '128px',
              fontWeight: 900,
              color: '#09090b',
              lineHeight: '0.88',
              fontFamily: 'monospace',
              letterSpacing: '-0.03em',
            }}
          >
            Lineal.
          </span>
          <span
            style={{
              fontSize: '26px',
              color: '#a1a1aa',
              marginTop: '28px',
              maxWidth: '620px',
              lineHeight: '1.45',
              fontFamily: 'sans-serif',
            }}
          >
            Un asistente de IA que resuelve tus problemas paso a paso, solo con Simplex.
          </span>
        </div>

        {/* Bottom: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mini simplex graph from the icon concept */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <line x1="4" y1="32" x2="4" y2="4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="32" x2="32" y2="32" stroke="#09090b" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="8" x2="30" y2="30" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="6" cy="8" r="3" fill="#10b981" />
            <circle cx="18" cy="20" r="3" fill="#10b981" />
            <circle cx="30" cy="30" r="3" fill="#10b981" />
          </svg>
          <span
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#09090b',
              fontFamily: 'monospace',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            SIMPLEX
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
