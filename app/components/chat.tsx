'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useRef, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { IconGear, IconSend } from './icons';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { FileUIPart, UIMessage } from 'ai';

const CHAT_IMAGES_BUCKET = 'chat-images';
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PENDING_IMAGES = 4;

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

function isTableExpression(math: string): boolean {
  return /\\begin\{(array|tabular|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/.test(math);
}

function stripDisplayMath(text: string): string {
  // Replace complete $$...$$ blocks that are table/matrix expressions with a placeholder;
  // non-table expressions are kept so they render inline during streaming.
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, inner) => {
    if (isTableExpression(inner)) return '\n*— tabla Simplex —*\n';
    return match;
  });
  // Count remaining $$ tokens. Non-table blocks contribute 2 each (open + close).
  // An odd count means there is one unclosed $$ at the end — strip from there to avoid
  // rendering a partial block. We must not use a simple regex here because non-table
  // blocks are kept with their $$ delimiters and a greedy regex would eat them too.
  let count = 0;
  let lastPos = -1;
  let searchPos = 0;
  while (true) {
    const idx = result.indexOf('$$', searchPos);
    if (idx === -1) break;
    count++;
    lastPos = idx;
    searchPos = idx + 2;
  }
  if (count % 2 !== 0) {
    result = result.slice(0, lastPos);
  }
  return result;
}

function preprocessLatex(text: string): string {
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$\n${normalizeDisplayMath(m.trim())}\n$$`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);
  // Model sometimes uses plain [ ] instead of \[ \] for multiline environments.
  // Complete block: [ \begin{...}...\end{...} ]
  text = text.replace(/\[\s*(\\begin\{[\s\S]*?\\end\{[^}]+\})\s*\]/g, (_, m) => `$$\n${normalizeDisplayMath(m.trim())}\n$$`);
  // Incomplete block at end of string (still streaming): convert [ \begin{...
  // to an opening $$ so stripDisplayMath can detect and strip the unclosed block.
  text = text.replace(/\[\s*(\\begin\{[\s\S]*)$/, (_, m) => `$$\n${m}`);
  text = text.replace(/\[ ([^\n[\]]+) \]/g, (match, m) => {
    if (/\\[a-zA-Z]|[_^]/.test(m)) return `$$\n${normalizeDisplayMath(m.trim())}\n$$`;
    return match;
  });
  return text;
}

function normalizeDisplayMath(math: string): string {
  if (/\\begin\{array\}/.test(math)) return `\\displaystyle ${math}`;
  return math;
}

interface ChatProps {
  id: string;
  initialMessages?: UIMessage[];
}

export function Chat({ id, initialMessages = [] }: ChatProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { messages, sendMessage, status } = useChat({
    id,
    messages: initialMessages,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: () => {
      router.refresh();
    },
  });

  const [input, setInput] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && pendingImages.length === 0) || status !== 'ready' || isUploadingImages) return;

    setImageError(null);
    setIsUploadingImages(true);

    try {
      const fileParts = await Promise.all(pendingImages.map(uploadPendingImage));
      const parts = trimmed
        ? [...fileParts, { type: 'text' as const, text: trimmed }]
        : fileParts;

      sendMessage({
        role: 'user',
        parts,
      });

      pendingImages.forEach(image => URL.revokeObjectURL(image.previewUrl));
      setPendingImages([]);
      setInput('');
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      setIsUploadingImages(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedImages = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));
    if (pastedImages.length === 0) return;

    e.preventDefault();
    addPendingImages(pastedImages);
  }

  function addPendingImages(files: File[]) {
    setImageError(null);

    setPendingImages(currentImages => {
      const availableSlots = MAX_PENDING_IMAGES - currentImages.length;
      if (availableSlots <= 0) {
        setImageError(`Solo puedes adjuntar hasta ${MAX_PENDING_IMAGES} imágenes por mensaje.`);
        return currentImages;
      }

      const acceptedImages: PendingImage[] = [];
      for (const file of files.slice(0, availableSlots)) {
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          setImageError('Cada imagen debe pesar 5 MB o menos.');
          continue;
        }

        acceptedImages.push({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (files.length > availableSlots) {
        setImageError(`Solo puedes adjuntar hasta ${MAX_PENDING_IMAGES} imágenes por mensaje.`);
      }

      return [...currentImages, ...acceptedImages];
    });
  }

  function removePendingImage(imageId: string) {
    setPendingImages(currentImages => {
      const imageToRemove = currentImages.find(image => image.id === imageId);
      if (imageToRemove) URL.revokeObjectURL(imageToRemove.previewUrl);
      return currentImages.filter(image => image.id !== imageId);
    });
  }

  async function uploadPendingImage(image: PendingImage): Promise<FileUIPart> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Debes iniciar sesión para subir imágenes.');

    const extension = getImageExtension(image.file);
    const path = `${user.id}/${id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(CHAT_IMAGES_BUCKET)
      .upload(path, image.file, {
        cacheControl: '3600',
        contentType: image.file.type,
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from(CHAT_IMAGES_BUCKET).getPublicUrl(path);
    return {
      type: 'file',
      mediaType: image.file.type,
      filename: image.file.name || `imagen.${extension}`,
      url: data.publicUrl,
    };
  }

  const canSubmit = (input.trim().length > 0 || pendingImages.length > 0) && status === 'ready' && !isUploadingImages;

  const isEmpty = messages.length === 0;

  const suggestions = [
    '¿Qué es el método Simplex?',
    '¿Cómo identifico la solución óptima?',
    '¿Qué son las variables de holgura?',
    '¿Cuándo hay solución no acotada?',
  ];

  const inputForm = (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full">
      <div className="relative flex flex-col rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-white transition-colors">
        {pendingImages.length > 0 && (
          <div className="flex gap-2 px-3 pt-3 overflow-x-auto">
            {pendingImages.map(image => (
              <div key={image.id} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={image.file.name || 'Imagen pegada'} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePendingImage(image.id)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-950/70 text-[10px] text-white hover:bg-zinc-950"
                  aria-label="Quitar imagen"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Pregunta algo sobre el método Simplex..."
          rows={1}
          disabled={status !== 'ready' || isUploadingImages}
          className="resize-none bg-transparent px-4 pt-3 pb-2 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 min-h-[44px] max-h-40 overflow-y-auto"
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="flex items-center text-xs text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800 rounded-full px-2.5 py-1 border border-zinc-200 dark:border-zinc-700">
            {isUploadingImages ? 'Subiendo imágenes...' : 'GPT-5.5'}
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
          >
            <IconSend className="text-white dark:text-zinc-900 w-3 h-3 cursor-pointer" />
          </button>
        </div>
        {imageError && (
          <p className="px-4 pb-3 text-xs text-red-500 dark:text-red-400">
            {imageError}
          </p>
        )}
      </div>
    </form>
  );

  if (isEmpty) {
    return (
      <div className="relative flex flex-col flex-1 h-full items-center justify-center px-4 overflow-hidden">
        <div className="absolute w-[600px] h-[360px] rounded-full bg-blue-200/60 dark:bg-blue-500/20 blur-[80px] pointer-events-none" />
        <h1 className="relative text-xl font-medium text-zinc-800 dark:text-zinc-200 mb-6">
          ¿Qué problema quieres resolver hoy con Simplex?
        </h1>
        <div className="relative w-full max-w-2xl">
          {inputForm}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { sendMessage({ text: s }); setInput(''); }}
                className="cursor-pointer text-xs px-3.5 py-2 rounded-xl shadow-sm dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto py-6">
        <div className="flex flex-col gap-6 max-w-2xl mx-auto px-4">
          {messages.map((message, i) => {
            const isLast = i === messages.length - 1;
            const isActiveAssistant = isLast && message.role === 'assistant' && (status === 'streaming' || status === 'submitted');
            return <MessageItem key={message.id} message={message} isStreaming={isActiveAssistant} />;
          })}
          {status === 'submitted' && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500">
              <span className="text-sm">Thinking</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4">
        {inputForm}
      </div>
    </div>
  );
}

type MessagePart =
  | { type: 'text'; text: string; state?: 'streaming' | 'done' }
  | ImageFilePart
  | { type: 'reasoning'; text: string; state?: 'streaming' | 'done' }
  | { type: string; toolCallId?: string; toolName?: string; state?: string; input?: unknown; output?: unknown };
type ImageFilePart = { type: 'file'; mediaType?: string; url?: string; filename?: string };
type Message = { id: string; role: string; parts: MessagePart[] };

function MessageItem({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === 'user';
  const text = message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('');
  const imageParts = message.parts.filter(isImageFilePart);

  const reasoningText = message.parts
    .filter((p): p is { type: 'reasoning'; text: string } => p.type === 'reasoning')
    .map(p => p.text)
    .join('');

  const activeTool = message.parts.find(
    p => (p.type.startsWith('tool-') || p.type === 'dynamic-tool') &&
         ('state' in p && (p.state === 'input-streaming' || p.state === 'input-available'))
  );

  const showThinkingDots = isStreaming && !text && !activeTool && !reasoningText;
  const showReasoning = isStreaming && !!reasoningText && !activeTool && !text;
  const showToolRunning = !!activeTool;

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="ml-auto max-w-[80%] rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 text-sm leading-relaxed">
          {imageParts.length > 0 && (
            <div className={`${text ? 'mb-2 ' : ''}flex flex-col items-end gap-2`}>
              {imageParts.map((part, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${message.id}-image-${index}`}
                  src={part.url}
                  alt={part.filename || `Imagen ${index + 1}`}
                  className="max-h-48 max-w-full rounded-xl object-contain"
                />
              ))}
            </div>
          )}
          {text && <p className="text-right">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 prose prose-sm dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
        {showThinkingDots && (
          <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 not-prose">
            <span className="text-sm">Thinking</span>
            <span className="flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce" />
            </span>
          </div>
        )}
        {showReasoning && (
          <div className="not-prose mb-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Pensando</span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic leading-relaxed line-clamp-4">
              {reasoningText}
            </p>
          </div>
        )}
        {showToolRunning && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 not-prose mb-3">
            <IconGear className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            <span className="text-xs font-medium">Resolviendo el problema con Simplex...</span>
          </div>
        )}
        {text && isStreaming && (
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {stripDisplayMath(preprocessLatex(text))}
          </ReactMarkdown>
        )}
        {text && !isStreaming && (
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {preprocessLatex(text)}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

function getImageExtension(file: File): string {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();
  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) return extensionFromName;

  switch (file.type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
}

function isImageFilePart(part: MessagePart): part is ImageFilePart & { url: string; mediaType: string } {
  if (part.type !== 'file') return false;

  const filePart = part as ImageFilePart;
  return typeof filePart.url === 'string' && filePart.mediaType?.startsWith('image/') === true;
}
