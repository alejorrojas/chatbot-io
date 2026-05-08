<div align="center">
  <img src="public/utn-logo.png" alt="UTN Logo" width="100" />

  <h2>Universidad Tecnológica Nacional</h2>
  <p>Facultad Regional Resistencia</p>

  <h1>Simplex</h1>
  <p>Un asistente de IA especializado en resolver problemas de programación lineal paso a paso con el método Simplex. Orientado a estudiantes universitarios — explica cada iteración, muestra las tablas en LaTeX y razona como un profesor.</p>

  <a href="https://chatbot-io-omega.vercel.app/">https://chatbot-io-omega.vercel.app/</a>

  <br /><br />

  <strong>Grupo:</strong> Los Opti-místicos

  <br />

  <strong>Equipo Docente:</strong> Screpnik, Claudia · Vera, Jorge Ariel

  <br /><br />

  | Integrante | Legajo | Rol |
  |---|---|---|
  | Aguirre Arteaga, Jaider Camilo | | Equipo de desarrollo |
  | Casano, Julieta | | Equipo de producción |
  | Dominguez, Bruno Ivan | 26.629 | Equipo de desarrollo |
  | Rojas, Alejo Ivan | 27.316 | Scrum Master |
  | Rodríguez Leiva, Juan Ignacio | 28.733 | Product Owner |
  | Sotelo, María Celina | | Equipo de testeo |

  <br />

  <strong>Ciclo Lectivo 2026</strong>
</div>

<br />

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| AI | Vercel AI SDK v6 + OpenAI gpt-5.5 |
| Auth & DB | Supabase (email/password, Postgres, RLS) |
| Estilos | Tailwind CSS v4 |
| Math | KaTeX + react-markdown |
| Package manager | Bun |

## Funcionalidades

- **Login / Signup** — autenticación por email y contraseña. El signup es inmediato (sin confirmación de email).
- **Chats persistidos** — cada conversación se guarda en Supabase y se puede retomar desde cualquier dispositivo.
- **Historial en el sidebar** — lista de chats ordenada por actividad reciente, con rename inline y borrado por chat.
- **Títulos generados con IA** — al enviar el primer mensaje, `gpt-4.1-mini` genera automáticamente un título descriptivo.
- **Solver determinista** — el problema se resuelve con una implementación Big-M de Simplex escrita en TypeScript, no por el LLM. Los números son exactos.
- **Explicación pedagógica** — el modelo usa los tableaux del solver para explicar cada iteración: variable entrante, variable saliente, pivote y operaciones elementales.
- **Render LaTeX** — las tablas Simplex se muestran en formato matemático usando KaTeX.

## Cómo correr localmente

```bash
bun install
cp .env.example .env.local
bun dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
OPENAI_API_KEY=sk-proj-...
```

## Estructura del proyecto

```
app/
  api/chat/          → Streaming de respuesta + persistencia de mensajes
  api/chats/         → CRUD de chats del usuario
  chat/[id]/         → Página de chat (server component, hidrata con mensajes del DB)
  login/             → Formulario de login/signup
  components/        → Chat, Sidebar, DotGrid, Icons
  tools/simplex.ts   → Implementación del método Simplex

lib/supabase/        → Clientes SSR y browser de Supabase
migrations/          → SQL de migraciones de base de datos
proxy.ts             → Protección de rutas + refresh de sesión
```

## Base de datos

```
chats     → id, user_id, title, created_at, updated_at
messages  → id, chat_id, role, parts (JSONB), created_at, order
```

RLS activado: cada usuario solo accede a sus propios datos.

## Limitaciones del solver

- Variables de decisión deben ser no negativas (x ≥ 0)
- No maneja variables libres
- RHS negativo en restricciones no soportado
- Sin prevención de ciclado (Bland's rule)
