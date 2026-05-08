'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { IconNewChat, IconSidebar, IconTrash } from './icons';

interface ChatEntry {
  id: string;
  title: string;
  updated_at: string;
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [chats, setChats] = useState<ChatEntry[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseBrowserClient();

  const loadChats = useCallback(async () => {
    const res = await fetch('/api/chats');
    if (res.ok) setChats(await res.json());
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? ''));
    loadChats();
  }, [loadChats, supabase.auth]);

  useEffect(() => {
    loadChats();
  }, [pathname, loadChats]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  function newChat() {
    router.push(`/chat/${crypto.randomUUID()}`);
  }

  async function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/chats?id=${id}`, { method: 'DELETE' });
    setChats(prev => prev.filter(c => c.id !== id));
    if (pathname === `/chat/${id}`) newChat();
  }

  function startEdit(chat: ChatEntry, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  }

  async function commitRename(id: string) {
    const trimmed = editingTitle.trim();
    setEditingId(null);
    if (!trimmed) return;

    setChats(prev => prev.map(c => c.id === id ? { ...c, title: trimmed } : c));
    await fetch(`/api/chats/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    });
  }

  function handleRenameKey(e: React.KeyboardEvent, id: string) {
    if (e.key === 'Enter') commitRename(id);
    if (e.key === 'Escape') setEditingId(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!open) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Abrir sidebar"
        >
          <IconSidebar />
        </button>
        <button
          onClick={newChat}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Nuevo chat"
        >
          <IconNewChat />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Cerrar sidebar"
        >
          <IconSidebar />
        </button>
        <button
          onClick={newChat}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Nuevo chat"
        >
          <IconNewChat />
        </button>
      </div>

      {/* New chat action */}
      <div className="px-2 py-2">
        <button
          onClick={newChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
        >
          <IconNewChat className="text-zinc-500" />
          Nuevo chat
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 px-2 py-2 overflow-y-auto">
        <p className="px-3 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          Historial
        </p>
        <div className="mt-1 space-y-0.5">
          {chats.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-400 dark:text-zinc-500 text-center">
              No hay chats anteriores
            </p>
          ) : (
            chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => editingId !== chat.id && router.push(`/chat/${chat.id}`)}
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  pathname === `/chat/${chat.id}`
                    ? 'bg-zinc-100 dark:bg-zinc-800'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {editingId === chat.id ? (
                  <input
                    ref={editInputRef}
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => commitRename(chat.id)}
                    onKeyDown={e => handleRenameKey(e, chat.id)}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm bg-transparent outline-none border-b border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 py-0.5"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 truncate"
                    onDoubleClick={e => startEdit(chat, e)}
                    title="Doble clic para renombrar"
                  >
                    {chat.title}
                  </span>
                )}

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
                  <button
                    onClick={e => startEdit(chat, e)}
                    className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    title="Renombrar"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={e => deleteChat(chat.id, e)}
                    className="p-0.5 rounded text-zinc-400 hover:text-red-500"
                    title="Eliminar"
                  >
                    <IconTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300 flex-shrink-0">
              {userEmail.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{userEmail}</span>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            Salir
          </button>
        </div>
      </div>
    </aside>
  );
}
