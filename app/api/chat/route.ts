import { convertToModelMessages, stepCountIs, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { simplexTool } from '@/app/tools/simplex';

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
- Cuando el usuario pida RESOLVER un problema de programación lineal, DEBES llamar a la herramienta \`solveSimplex\`. Nunca calcules la solución manualmente.
- El input del tool es natural: "objective" es un mapa variable→coeficiente, y "constraints" es una lista donde cada elemento tiene los coeficientes, el tipo (<=, >=, =) y el RHS.
- Después de obtener el resultado, explica el proceso y muestra las tablas Simplex en formato LaTeX si el usuario lo solicita.
- No respondas preguntas que no estén relacionadas con programación lineal y el método Simplex.`,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools: { solveSimplex: simplexTool },
  });

  return result.toUIMessageStreamResponse();
}
