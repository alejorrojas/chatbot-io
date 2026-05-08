import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

interface Props {
  params: Promise<{ id: string }>;
}

// PATCH /api/chats/[id] — rename a chat
export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  const { title } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('chats')
    .update({ title: title.trim().slice(0, 100) })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// POST /api/chats/[id]/generate-title is handled separately.
// This route also exposes a helper used by /api/chat onFinish.
export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const { message } = await request.json();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { text } = await generateText({
    model: openai('gpt-4.1-mini'),
    prompt: `Generate a short title of maximum 6 words (no quotes, no punctuation at the end) that summarizes this message: "${message.slice(0, 300)}"`,
  });

  const title = text.trim().slice(0, 100);

  await supabase
    .from('chats')
    .update({ title })
    .eq('id', id)
    .eq('user_id', user.id);

  return NextResponse.json({ title });
}
