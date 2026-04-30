import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai('gpt-5.5'),
    system:
      'Eres un asistente especializado en programación lineal. Ayudas a resolver problemas de optimización, modelado matemático y uso de herramientas como PuLP, SciPy, Gurobi y similares.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
