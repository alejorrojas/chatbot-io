# Documentación Técnica — Simplex AI

> Universidad Tecnológica Nacional · Facultad Regional Resistencia  
> Grupo: Los Opti-místicos · Ciclo Lectivo 2026

---

## Índice

1. [Visión general del sistema](#1-visión-general-del-sistema)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Arquitectura](#3-arquitectura)
4. [Cómo funciona el sistema](#4-cómo-funciona-el-sistema)
   - 4.1 [Autenticación](#41-autenticación)
   - 4.2 [Flujo de una consulta](#42-flujo-de-una-consulta)
   - 4.3 [Solver Simplex Big-M](#43-solver-simplex-big-m)
   - 4.4 [Persistencia de datos](#44-persistencia-de-datos)
   - 4.5 [Generación de títulos](#45-generación-de-títulos)
5. [Base de datos](#5-base-de-datos)
6. [Seguridad](#6-seguridad)
7. [Variables de entorno](#7-variables-de-entorno)
8. [Limitaciones conocidas](#8-limitaciones-conocidas)

---

## 1. Visión general del sistema

**Simplex** es una aplicación web full-stack diseñada para asistir a estudiantes universitarios en el aprendizaje del método Simplex para programación lineal. Combina tres piezas fundamentales:

- Un **LLM (GPT-5.5)** que actúa como tutor pedagógico.
- Un **solver determinista** escrito en TypeScript que calcula los tableaux con precisión matemática.
- Una **capa de persistencia** (Supabase) que guarda el historial de conversaciones por usuario.

El modelo nunca calcula los números por su cuenta: siempre invoca al solver y usa sus resultados para explicar el proceso iteración por iteración, como lo haría un profesor frente a una pizarra.

---

## 2. Tecnologías utilizadas

### Runtime y framework

| Tecnología | Versión | Rol |
|---|---|---|
| **Next.js** | 16.2.4 | Framework principal (App Router, SSR, API Routes) |
| **React** | 19.2.4 | Capa de UI, gestión de estado del chat |
| **TypeScript** | 5 | Lenguaje base para todo el proyecto |
| **Bun** | — | Gestor de paquetes y runtime de scripts |

Next.js se usa con el **App Router**, lo que permite mezclar Server Components (para carga inicial de datos) con Client Components (para la UI interactiva del chat).

### Inteligencia artificial

| Tecnología | Versión | Rol |
|---|---|---|
| **Vercel AI SDK** (`ai`) | 6.0.170 | Orquestación de LLM, streaming, tool use |
| **@ai-sdk/openai** | 3.0.54 | Provider de OpenAI para el AI SDK |
| **@ai-sdk/react** | 3.0.172 | Hook `useChat` para el cliente |
| **OpenAI gpt-5.5** | — | Modelo principal (tutor pedagógico) |
| **OpenAI gpt-4.1-mini** | — | Modelo auxiliar (generación de títulos) |

El AI SDK maneja automáticamente el streaming de tokens, el ciclo de tool use (llamar al solver y volver al modelo), y la serialización de mensajes.

### Base de datos y autenticación

| Tecnología | Versión | Rol |
|---|---|---|
| **Supabase** (`@supabase/supabase-js`) | 2.105.3 | Cliente principal de Supabase |
| **Supabase SSR** (`@supabase/ssr`) | 0.10.3 | Manejo de sesión en Server Components |
| **PostgreSQL** | (gestionado por Supabase) | Almacenamiento de chats y mensajes |
| **Supabase Auth** | — | Login/signup con email y contraseña |
| **Supabase Storage** | — | Almacenamiento de imágenes subidas |

### Estilos

| Tecnología | Versión | Rol |
|---|---|---|
| **Tailwind CSS** | 4 | Framework de utilidades CSS |
| **@tailwindcss/typography** | 0.5.19 | Estilos tipográficos para markdown |
| **PostCSS** | — | Procesamiento del CSS |

### Renderizado matemático

| Tecnología | Versión | Rol |
|---|---|---|
| **KaTeX** | 0.16.45 | Renderizado de expresiones LaTeX en el cliente |
| **react-markdown** | 10.1.0 | Renderizado de markdown (respuestas del LLM) |
| **remark-math** | 6.0.0 | Plugin para detectar bloques matemáticos en markdown |
| **rehype-katex** | 7.0.1 | Plugin para convertir bloques math a KaTeX |

Las tablas Simplex se envían como LaTeX en el stream de texto y se renderizan en el cliente con esta cadena de procesamiento.

### Validación y solver

| Tecnología | Versión | Rol |
|---|---|---|
| **Zod** | 4.4.3 | Validación del schema de entrada al solver (tool definition) |
| **javascript-lp-solver** | 1.0.3 | Librería LP de soporte (referencia) |

El solver principal está implementado completamente en TypeScript (`app/tools/simplex.ts`) sin depender de librerías externas.

---

## 3. Arquitectura

```
┌───────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser)                     │
│                                                           │
│  React 19 + Next.js App Router                            │
│  ┌─────────────────┐   ┌────────────────────────────────┐ │
│  │   sidebar.tsx   │   │          chat.tsx              │ │
│  │  (historial)    │   │  useChat hook (AI SDK)         │ │
│  │                 │   │  Streaming tokens              │ │
│  │  GET /api/chats │   │  react-markdown + KaTeX        │ │
│  └─────────────────┘   └────────────────────────────────┘ │
└────────────────────────┬──────────────────────────────────┘
                         │ POST /api/chat (HTTP Streaming)
┌────────────────────────▼──────────────────────────────────┐
│                  SERVIDOR (Next.js Edge/Node)              │
│                                                            │
│  app/api/chat/route.ts                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  1. Autenticación (Supabase)                        │  │
│  │  2. Lee PDF Taha (context de referencia)            │  │
│  │  3. streamText(gpt-5.5, tools: { solveSimplex })    │  │
│  │  4. onFinish → persiste en Supabase                 │  │
│  └────────────────────────┬────────────────────────────┘  │
└───────────────────────────┼────────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
┌─────────▼───────┐ ┌───────▼───────┐ ┌───────▼──────────┐
│   OpenAI API    │ │ simplex.ts    │ │   Supabase       │
│                 │ │               │ │                  │
│  gpt-5.5        │ │ Big-M Simplex │ │ PostgreSQL       │
│  (tutor)        │ │ TypeScript    │ │ chats + messages │
│                 │ │               │ │                  │
│  gpt-4.1-mini   │ │ Retorna       │ │ Auth             │
│  (títulos)      │ │ tableaux[]    │ │ Storage          │
└─────────────────┘ └───────────────┘ └──────────────────┘
```

---

## 4. Cómo funciona el sistema

### 4.1 Autenticación

El middleware ([proxy.ts](proxy.ts)) protege todas las rutas bajo `/chat`. Si el usuario no tiene sesión activa, lo redirige a `/login`.

```
Usuario accede a /chat/[id]
        ↓
proxy.ts verifica sesión (Supabase SSR)
        ├── Sin sesión → redirect a /login
        └── Con sesión → continúa
                ↓
        login/page.tsx (si vino de /login)
        - signInWithPassword() o signUp()
        - Signup inmediato (sin confirmación de email)
        - Redirect a /chat tras login
```

Los clientes de Supabase se instancian según el contexto:
- **`lib/supabase/client.ts`** — para Client Components (usa `createBrowserClient`)
- **`lib/supabase/server.ts`** — para Server Components y API routes (usa `createServerClient` con cookies)

### 4.2 Flujo de una consulta

Este es el flujo completo desde que el usuario escribe hasta que ve la respuesta:

```
1. USUARIO escribe el problema en el chat
        ↓
2. chat.tsx: useChat hook → POST /api/chat
   Payload: { messages: UIMessage[], id: chatId }
        ↓
3. /api/chat/route.ts:
   a. Valida sesión con Supabase
   b. Hace upsert del chat (crea si no existe)
   c. Llama a streamText() con:
      - model: gpt-5.5
      - system: prompt pedagógico en español
      - messages: [PDF Taha, ...historial del usuario]
      - tools: { solveSimplex }
        ↓
4. OpenAI gpt-5.5 recibe el problema + el libro de Taha
   PRIMERA RESPUESTA: confirma que entendió y pregunta
   "¿Quieres que lo resuelva con Simplex?"
        ↓
5. USUARIO confirma ("sí", "adelante", etc.)
        ↓
6. gpt-5.5 decide llamar a la tool solveSimplex
   con los parámetros del problema (JSON estructurado):
   {
     opType: "max" | "min",
     objective: { x1: 3, x2: 5 },
     constraints: [
       { coefficients: { x1: 1, x2: 2 }, type: "<=", rhs: 4 }
     ]
   }
        ↓
7. simplex.ts ejecuta el algoritmo Big-M
   Retorna: { feasible, bounded, optimal, variables, tableaux[] }
        ↓
8. gpt-5.5 recibe los tableaux y genera la respuesta final:
   - Formulación matemática en LaTeX
   - Por cada iteración: tabla, variable entrante/saliente, pivote
   - Tabla óptima y solución
   - Interpretación del resultado
        ↓
9. Tokens llegan por streaming → chat.tsx los muestra en tiempo real
   react-markdown + rehype-katex renderiza LaTeX al vuelo
        ↓
10. onFinish: persiste todos los mensajes en Supabase
    + genera título automático (gpt-4.1-mini)
```

**Nota importante sobre el límite de pasos:** La llamada a `streamText` usa `stopWhen: stepCountIs(5)`, lo que significa que el ciclo LLM → tool → LLM puede ocurrir hasta 5 veces antes de forzar el cierre del stream. Esto previene bucles infinitos en casos de problemas complejos.

### 4.3 Solver Simplex Big-M

El solver vive íntegramente en [app/tools/simplex.ts](app/tools/simplex.ts) y no depende de ninguna librería externa para la matemática. Implementa el **método Big-M** que maneja todos los tipos de restricciones en un solo paso (a diferencia del método de dos fases).

**Pasos del algoritmo:**

```
Entrada: opType, objective, constraints
        ↓
1. FORMA ESTÁNDAR
   Para cada restricción:
   ≤  →  agrega variable de holgura s_i  (+1)
   ≥  →  agrega variable de exceso s_i  (−1) + artificial a_i (+1)
   =  →  agrega variable artificial a_i (+1)
        ↓
2. FUNCIÓN OBJETIVO AUMENTADA
   - Maximizar: almacena −c_j en la fila Z (criterio de coeficiente más negativo)
   - Minimizar: convierte a max(−c·x)
   - Penalización Big-M: suma BIG_M = 1,000,000 a las columnas artificiales
   - Ajusta la fila Z para que las artificiales inicialmente básicas tengan costo reducido 0
        ↓
3. ITERACIONES SIMPLEX
   Repetir hasta MAX_ITERATIONS = 200 o hasta optimalidad:
   
   a. VARIABLE ENTRANTE: columna con costo reducido más negativo (< −1e-9)
      Si no existe → solución óptima encontrada
   
   b. VARIABLE SALIENTE: prueba de razón mínima
      Para filas con coeficiente positivo en la columna pivote:
      ratio = RHS / coeficiente_pivote
      Toma la fila con ratio mínimo
      Si ninguna fila es positiva → problema no acotado (return bounded: false)
   
   c. PIVOTEO:
      - Normaliza la fila pivote dividiendo por el elemento pivote
      - Elimina la columna pivote de todas las demás filas (incluyendo Z)
   
   d. Toma snapshot del tableau actual → tableaux.push(snap)
        ↓
4. VERIFICACIÓN DE FACTIBILIDAD
   Si alguna artificial sigue siendo básica con RHS > 1e-6 → infactible (return feasible: false)
        ↓
5. EXTRACCIÓN DE SOLUCIÓN
   Para cada variable de decisión:
   - Si es básica (está en basicVars): su valor es el RHS de esa fila
   - Si no es básica: su valor es 0
   optimal = mat[m][n] (para max) o −mat[m][n] (para min)
```

**Parámetros de tolerancia numérica:**

| Constante | Valor | Uso |
|---|---|---|
| `BIG_M` | 1,000,000 | Penalización para variables artificiales |
| `OPTIMALITY_TOL` | 1e-9 | Umbral para detectar costos reducidos negativos |
| `PIVOT_TOL` | 1e-9 | Umbral para considerar un elemento positivo en ratio test |
| `ZERO_TOL` | 1e-10 | Umbral para eliminación en filas |
| `FEASIBILITY_TOL` | 1e-6 | Umbral para detectar artificiales básicas |
| `ROUND_DECIMALS` | 4 | Decimales en la solución final |

**Estructura del resultado (`SimplexResult`):**

```typescript
{
  feasible: boolean,          // ¿Tiene solución?
  bounded: boolean,           // ¿La solución es finita?
  optimal?: number,           // Valor óptimo de Z
  variables?: Record<string, number>,  // Valores de x1, x2, ...
  tableaux: TableauSnapshot[] // Un snapshot por iteración
}
```

Cada `TableauSnapshot` contiene la matriz completa del tableau en ese momento, los nombres de las columnas y las variables básicas de cada fila — suficiente para que el LLM reproduzca la tabla en LaTeX y explique el pivote.

### 4.4 Persistencia de datos

La persistencia ocurre en el callback `onFinish` de `streamText`, que se ejecuta **después** de que el stream completa (incluso si el cliente se desconectó, gracias a `result.consumeStream()`).

```
onFinish recibe los mensajes finales completos
        ↓
1. DELETE todos los mensajes existentes del chat (para evitar duplicados en retries)
        ↓
2. INSERT todos los mensajes con:
   - id: generado por el servidor (formato msg_<16 chars>)
   - chat_id: UUID del chat
   - role: 'user' | 'assistant'
   - parts: array JSONB con el contenido completo (texto, imágenes, tool calls, tool results)
   - order: índice de posición en la conversación
        ↓
3. Si es el primer turno del usuario:
   Genera título con gpt-4.1-mini
   UPDATE chats.title con el título generado (máx 100 chars)
```

La carga del historial ocurre en el Server Component `app/chat/[id]/page.tsx`, que hace `SELECT` de mensajes antes de renderizar la página y los pasa como `initialMessages` al componente de chat.

### 4.5 Generación de títulos

Al finalizar el primer turno (cuando hay exactamente 1 mensaje del usuario), el servidor llama a `gpt-4.1-mini` con este prompt:

```
"Generate a short title of maximum 6 words (no quotes, no punctuation at the end)
that summarizes this message: '<primer mensaje del usuario truncado a 300 chars>'"
```

El título resultante se almacena en `chats.title` y aparece inmediatamente en el sidebar al hacer `router.refresh()`.

---

## 5. Base de datos

### Esquema

```sql
-- Tabla: chats
-- Una fila por conversación
id          UUID        PK, gen_random_uuid()
user_id     UUID        FK auth.users(id), ON DELETE CASCADE
title       TEXT        Generado por IA o manual
created_at  TIMESTAMPTZ NOW()
updated_at  TIMESTAMPTZ NOW(), actualizado por trigger

-- Tabla: messages
-- Una fila por mensaje (usuario o asistente)
id          TEXT        PK, formato: msg_<16 chars>
chat_id     UUID        FK chats(id), ON DELETE CASCADE
role        TEXT        CHECK IN ('user', 'assistant', 'system')
parts       JSONB       Array de UIMessage parts (Vercel AI SDK)
created_at  TIMESTAMPTZ
"order"     INTEGER     Posición en la conversación
```

### Índices

```sql
-- Cargar chats de un usuario ordenados por actividad reciente
chats_user_id_updated_idx  ON chats (user_id, updated_at DESC)

-- Cargar mensajes de un chat en orden
messages_chat_order_idx    ON messages (chat_id, "order" ASC)
```

### Trigger

```sql
-- Actualiza updated_at automáticamente en cada UPDATE a chats
CREATE TRIGGER chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. Seguridad

### Row Level Security (RLS)

Toda la base de datos tiene RLS activado. Las políticas garantizan que cada usuario solo puede ver y modificar sus propios datos:

```sql
-- Un usuario solo accede a sus propios chats
CREATE POLICY "chats: select own"
  ON chats FOR SELECT USING (auth.uid() = user_id);

-- Un usuario accede a mensajes solo si el chat le pertenece
CREATE POLICY "messages: select via chat"
  ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND chats.user_id = auth.uid()
  ));
```

Hay políticas equivalentes para `INSERT`, `UPDATE` y `DELETE` en ambas tablas.

### Protección de rutas

El middleware en [proxy.ts](proxy.ts) verifica la sesión de Supabase en cada request a rutas protegidas (`/chat/*`). Si no hay sesión válida, redirige a `/login` antes de que Next.js procese la ruta.

### API

La ruta `/api/chat` valida la sesión con `supabase.auth.getUser()` antes de procesar cualquier mensaje. Si no hay usuario autenticado, retorna `401 Unauthorized`.

---

## 7. Variables de entorno

```bash
# URL pública del proyecto de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co

# Clave pública (anon key) de Supabase — segura para el cliente
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Clave secreta de Supabase — solo en el servidor
SUPABASE_SECRET_KEY=sb_secret_...

# Clave de la API de OpenAI — solo en el servidor
OPENAI_API_KEY=sk-proj-...
```

Las variables con prefijo `NEXT_PUBLIC_` son expuestas al navegador. Las demás son exclusivamente del servidor.

---

## 8. Limitaciones conocidas

| Limitación | Detalle |
|---|---|
| Variables no negativas | El solver asume x ≥ 0 para todas las variables de decisión |
| Sin variables libres | No se soportan variables sin restricción de signo |
| RHS no negativo | El lado derecho de cada restricción debe ser ≥ 0 |
| Sin prevención de ciclado | La regla de Bland no está implementada; problemas degenerados pueden ciclar |
| Máximo de iteraciones | El solver se detiene a las 200 iteraciones para evitar bucles infinitos |
| Solo método Simplex | El asistente no responde consultas sobre otros métodos de optimización |
