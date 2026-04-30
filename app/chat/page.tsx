'use client';

import { useState } from 'react';
import { Chat } from '../components/chat';
import { Sidebar } from '../components/sidebar';
import { IconSidebar, IconNewChat } from '../components/icons';

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        {!sidebarOpen && (
          <div className="flex items-center gap-2 px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Open sidebar"
            >
              <IconSidebar />
            </button>
            <button
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="New chat"
            >
              <IconNewChat />
            </button>
          </div>
        )}
        <Chat />
      </div>
    </div>
  );
}
