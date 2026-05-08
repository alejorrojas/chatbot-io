import { convertToModelMessages, createIdGenerator, generateText, stepCountIs, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { simplexTool } from '@/app/tools/simplex';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const maxDuration = 300;

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, id: chatId }: { messages: UIMessage[]; id: string } = await req.json();

  // Lazy creation: ensure chat row exists with a placeholder title
  await supabase.from('chats').upsert(
    { id: chatId, user_id: user.id, title: 'Nueva conversación' },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  const result = streamText({
    model: openai('gpt-5.5'),
    providerOptions: {
      openai: { reasoningEffort: 'low' },
    },
    system: `Eres un asistente de programación lineal con enfoque universitario. Tu propósito es que el estudiante entienda el método Simplex a fondo, no solo obtener la respuesta.

MÉTODO:
- Solo resuelves usando el método Simplex (primal, dual o dos fases según corresponda).
- Si piden otro método (gráfico, Branch and Bound, algoritmo genético, etc.) declina amablemente y redirige al Simplex.
- Puedes ayudar con el modelado (función objetivo, restricciones, variables de holgura/artificiales) como paso previo.
- No respondas preguntas ajenas a programación lineal y el método Simplex.

USO DE LA HERRAMIENTA:
- Cuando el usuario pida RESOLVER un problema, SIEMPRE llama a la herramienta \`solveSimplex\` para obtener los resultados exactos. Nunca calcules los números manualmente.
- La herramienta devuelve las tablas de cada iteración (tableaux). Úsalas para mostrar el proceso completo.

FORMATO OBLIGATORIO AL RESOLVER:
1. Formulación: muestra el modelo matemático completo (función objetivo, restricciones, variables de holgura/artificiales).
2. Por cada iteración que devuelva la herramienta:
   - Muestra la tabla Simplex completa en LaTeX usando el entorno array.
   - Indica la variable entrante y por qué (coeficiente más negativo en fila Z).
   - Indica la variable saliente y por qué (razón mínima positiva — prueba de la razón mínima).
   - Muestra el elemento pivote y explica las operaciones elementales de fila aplicadas.
3. Tabla final: presenta la tabla óptima e indica el valor de cada variable y de Z.
4. Interpretación: explica en una o dos oraciones qué significa la solución en el contexto del problema.

ESTILO PEDAGÓGICO:
- Explica el "por qué" de cada decisión, no solo el "qué".
- Usa lenguaje claro y accesible, como lo haría un profesor en clase.
- Si el estudiante comete un error en su planteamiento, señálalo y explica cómo corregirlo.
- Si la solución es no acotada o infactible, explica qué indica eso y cómo se detecta en la tabla.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: { solveSimplex: simplexTool },
  });

  // consumeStream ensures onFinish fires even if client disconnects
  result.consumeStream();

  return result.toUIMessageStreamResponse({
    generateMessageId,
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      // Re-insert full conversation to keep state consistent after retries
      await supabase.from('messages').delete().eq('chat_id', chatId);

      if (finalMessages.length === 0) return;

      await supabase.from('messages').insert(
        finalMessages.map((msg, index) => ({
          id: msg.id,
          chat_id: chatId,
          role: msg.role,
          parts: msg.parts,
          created_at: new Date().toISOString(),
          order: index,
        }))
      );

      // Generate a meaningful title from the first user message (only on first turn)
      const isFirstTurn = finalMessages.filter(m => m.role === 'user').length === 1;
      if (isFirstTurn) {
        const firstUser = finalMessages.find(m => m.role === 'user');
        const textPart = firstUser?.parts.find(
          (p): p is { type: 'text'; text: string } => p.type === 'text'
        );
        if (textPart?.text) {
          const { text: generatedTitle } = await generateText({
            model: openai('gpt-4.1-mini'),
            prompt: `Generate a short title of maximum 6 words (no quotes, no punctuation at the end) that summarizes this message: "${textPart.text.slice(0, 300)}"`,
          });
          await supabase
            .from('chats')
            .update({ title: generatedTitle.trim().slice(0, 100) })
            .eq('id', chatId);
        }
      }
    },
  });
}
