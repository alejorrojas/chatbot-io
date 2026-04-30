'use client';

import { IconNewChat, IconSidebar, IconTrash } from './icons';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  if (!open) return null;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Close sidebar"
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

      {/* Actions */}
      <div className="px-2 py-2 space-y-0.5">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left">
          <IconNewChat className="text-zinc-500" />
          New chat
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left">
          <IconTrash className="text-zinc-500" />
          Delete all
        </button>
      </div>

      {/* History placeholder */}
      <div className="flex-1 px-2 py-2 overflow-y-auto">
        <p className="px-3 py-1 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          History
        </p>
        <div className="mt-1 space-y-0.5">
          <p className="px-3 py-4 text-xs text-zinc-400 dark:text-zinc-500 text-center">
            No hay chats anteriores
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
            G
          </div>
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Guest</span>
        </div>
      </div>
    </aside>
  );
}
