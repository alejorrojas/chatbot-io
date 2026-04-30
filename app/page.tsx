import Link from 'next/link';
import katex from 'katex';
import { DotGrid } from './components/dot-grid';

export const metadata = {
  title: 'Simplex',
  description: 'Resuelve problemas de programación lineal paso a paso con el método Simplex',
};

const initialTableau = katex.renderToString(
  `\\displaystyle\\begin{array}{c|cccc|c}
  \\text{Base} & x_1 & x_2 & s_1 & s_2 & b \\\\
  \\hline
  s_1 & 1 & 3 & 1 & 0 & 9 \\\\
  s_2 & 2 & 1 & 0 & 1 & 8 \\\\
  \\hline
  Z & {-1} & {-2} & 0 & 0 & 0
  \\end{array}`,
  { displayMode: true, throwOnError: false }
);

const optimalTableau = katex.renderToString(
  `\\displaystyle\\begin{array}{c|cccc|c}
  \\text{Base} & x_1 & x_2 & s_1 & s_2 & b \\\\
  \\hline
  x_2 & 0 & 1 & \\tfrac{2}{5} & -\\tfrac{1}{5} & 2 \\\\
  x_1 & 1 & 0 & -\\tfrac{1}{5} & \\tfrac{3}{5} & 3 \\\\
  \\hline
  Z & 0 & 0 & \\tfrac{3}{5} & \\tfrac{1}{5} & 7
  \\end{array}`,
  { displayMode: true, throwOnError: false }
);

const features = [
  {
    number: '01',
    title: 'Explicar un concepto',
    body: 'Preguntá qué es un pivote, cómo elegir la variable entrante, o qué significa que Z sea óptimo. Respuestas claras y formales.',
  },
  {
    number: '02',
    title: 'Revisar mi modelo',
    body: 'Pegá tu formulación y el asistente detecta errores: restricciones mal planteadas, variables faltantes, inconsistencias.',
  },
  {
    number: '03',
    title: 'Resolver un problema',
    body: 'Describí el problema en lenguaje natural. El asistente lo modela, aplica Simplex y muestra cada tabla paso a paso.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-mono text-sm font-semibold tracking-widest text-zinc-900 uppercase">
            Simplex
          </span>
          <Link
            href="/chat"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Abrir chat →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[82vh] flex items-center">
        <DotGrid className="absolute inset-0 w-full h-full" />
        <div className="dot-fade absolute inset-0 pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">
          <div className="landing-tag inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 bg-white text-xs text-zinc-500 font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Método Simplex · Paso a paso
          </div>

          <h1 className="landing-h1 font-mono font-bold tracking-tight leading-[0.9] text-zinc-950">
            <span className="block text-[clamp(3.5rem,10vw,8rem)]">Programación</span>
            <span className="block text-[clamp(3.5rem,10vw,8rem)]">Lineal.</span>
            <span className="block text-[clamp(1.5rem,3.5vw,2.5rem)] text-zinc-400 mt-4 font-normal tracking-normal leading-snug max-w-xl">
              Un asistente de IA que resuelve tus problemas paso a paso, solo con Simplex.
            </span>
          </h1>

          <div className="landing-cta flex items-center gap-4 mt-10">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-950 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Comenzar ahora
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <span className="text-sm text-zinc-400">Sin registro · Gratis</span>
          </div>
        </div>
      </section>

      {/* Tableau showcase */}
      <section className="py-24 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-12">
            Ejemplo · Simplex Primal
          </p>

          <div className="grid md:grid-cols-[1fr_auto_1fr] items-center gap-6">
            <div className="tableau-card rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <p className="font-mono text-xs text-zinc-400 mb-5 uppercase tracking-wider">Tabla inicial</p>
              <div className="overflow-x-auto text-sm" dangerouslySetInnerHTML={{ __html: initialTableau }} />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="hidden md:block w-px h-12 bg-zinc-200" />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider whitespace-nowrap">Pivoteo</span>
              <div className="hidden md:block w-px h-12 bg-zinc-200" />
            </div>

            <div className="tableau-card rounded-2xl border border-zinc-200 bg-zinc-50 p-6 relative">
              <div className="absolute -top-3 left-4">
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Óptimo
                </span>
              </div>
              <p className="font-mono text-xs text-zinc-400 mb-5 uppercase tracking-wider">Tabla final</p>
              <div className="overflow-x-auto text-sm" dangerouslySetInnerHTML={{ __html: optimalTableau }} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-5xl mx-auto px-6">
          <p className="font-mono text-xs text-zinc-400 uppercase tracking-widest mb-12">
            Capacidades
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.number} className="feature-card p-6 rounded-2xl bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all">
                <span className="font-mono text-xs text-zinc-300 block mb-4">{f.number}</span>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-mono font-bold text-white text-4xl md:text-5xl tracking-tight mb-4">
            ¿Listo para resolver<br className="hidden md:block" /> tu problema?
          </h2>
          <p className="text-zinc-500 mb-10 text-lg">
            Solo describí el problema y el método Simplex hace el resto.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-zinc-950 text-sm font-semibold hover:bg-zinc-100 transition-colors"
          >
            Iniciar chat gratuito
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="font-mono text-xs text-zinc-600 uppercase tracking-widest">Simplex</span>
          <span className="text-xs text-zinc-700">Powered by GPT-5.5</span>
        </div>
      </footer>
    </div>
  );
}
