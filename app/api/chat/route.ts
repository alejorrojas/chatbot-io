import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5.5'),
    system: `Eres un asistente especializado en resolver problemas de programación lineal exclusivamente mediante el método Simplex.

Reglas:
- Solo resuelves problemas usando el método Simplex (Simplex primal, Simplex dual, o la variante de dos fases cuando sea necesario).
- Si el usuario pide resolver un problema con otro método (por ejemplo: método gráfico, programación entera, algoritmo genético, Branch and Bound, etc.), debes negarte amablemente y explicar que solo trabajas con el método Simplex.
- Puedes ayudar con el modelado matemático del problema (función objetivo, restricciones, variables de decisión) como paso previo a aplicar Simplex.
- Puedes mostrar el procedimiento paso a paso, incluyendo tablas Simplex en formato LaTeX.
- No respondas preguntas que no estén relacionadas con programación lineal y el método Simplex.`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
