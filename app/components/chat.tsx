'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { IconBot, IconSend } from './icons';

// Models often output [ ... ] or \[ ... \] as display math delimiters.
// remark-math only understands $...$ and $$...$$, so we normalize first.
function preprocessLatex(text: string): string {
  // \[...\] → $$...$$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$\n${normalizeDisplayMath(m.trim())}\n$$`);
  // \(...\) → $...$
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);
  // [ latex ] → $$...$$ only when the content looks like LaTeX
  text = text.replace(/\[ ([^\n[\]]+) \]/g, (match, m) => {
    if (/\\[a-zA-Z]|[_^]/.test(m)) return `$$\n${normalizeDisplayMath(m.trim())}\n$$`;
    return match;
  });
  return text;
}

// Add \displaystyle inside array environments so \frac renders full-size
function normalizeDisplayMath(math: string): string {
  if (/\\begin\{array\}/.test(math)) {
    return `\\displaystyle ${math}`;
  }
  return math;
}

export function Chat() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || status !== 'ready') return;
    sendMessage({ text: trimmed });
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <IconBot className="text-zinc-500" />
            </div>
            <p className="text-sm">¿En qué problema de programación lineal puedo ayudarte?</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto px-4">
            {messages.map(message => (
              <MessageItem key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="relative flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              rows={1}
              disabled={status !== 'ready'}
              className="resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 min-h-[44px] max-h-40 overflow-y-auto"
            />
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-full px-2.5 py-1 border border-zinc-200 dark:border-zinc-700">
                <IconBot className="w-3 h-3" />
                GPT-5.5
              </span>
              <button
                type="submit"
                disabled={!input.trim() || status !== 'ready'}
                className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
              >
                <IconSend className="text-white dark:text-zinc-900 w-3 h-3" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

type MessagePart = { type: string; text?: string };
type Message = { id: string; role: string; parts: MessagePart[] };

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const text = message.parts
    .filter(p => p.type === 'text')
    .map(p => p.text)
    .join('');

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm leading-relaxed">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <IconBot className="text-zinc-500 w-4 h-4" />
      </div>
      <div className="flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 prose prose-sm dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
          {preprocessLatex(text)}
        </ReactMarkdown>
      </div>
    </div>
  );
}
