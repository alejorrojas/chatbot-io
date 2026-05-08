import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Chat } from '@/app/components/chat';
import { Sidebar } from '@/app/components/sidebar';
import type { UIMessage } from 'ai';

interface Props {
  params: Promise<{ id: string }>;
}

async function loadMessages(chatId: string): Promise<UIMessage[]> {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from('messages')
    .select('id, role, parts, created_at')
    .eq('chat_id', chatId)
    .order('order', { ascending: true });

  if (!data || data.length === 0) return [];

  return data.map(row => ({
    id: row.id,
    role: row.role as UIMessage['role'],
    parts: row.parts,
  }));
}

export default async function ChatIdPage({ params }: Props) {
  const { id } = await params;
  const initialMessages = await loadMessages(id);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Chat id={id} initialMessages={initialMessages} />
      </div>
    </div>
  );
}
