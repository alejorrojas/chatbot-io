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
          justifyContent: 'center',
          padding: '80px 96px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Bottom fade */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '260px',
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
            width: '180px',
            background: 'linear-gradient(to right, transparent, #ffffff)',
            display: 'flex',
          }}
        />

        {/* Title */}
        <span
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: '#09090b',
            fontFamily: 'monospace',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Simplex — Programación Lineal
        </span>

        {/* Subtitle */}
        <span
          style={{
            fontSize: '30px',
            color: '#71717a',
            fontFamily: 'sans-serif',
            marginTop: '24px',
            lineHeight: 1.4,
          }}
        >
          Un asistente de IA que resuelve tus problemas paso a paso, solo con Simplex.
        </span>

        {/* Wordmark bottom-left */}
        <div
          style={{
            position: 'absolute',
            bottom: '64px',
            left: '96px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
            }}
          />
          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#09090b',
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
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
