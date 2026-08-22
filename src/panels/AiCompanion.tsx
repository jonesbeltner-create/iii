import { useEffect, useRef, useState } from 'react';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/data';

function FormattedMessage({ content }: { content: string }) {
  const paragraphs = content.trim().split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 12)}`} className="whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

let idCounter = 0;
const nextId = () => `msg-${Date.now()}-${idCounter++}`;

const SYSTEM_PROMPT =
  'You are Nexus, a friendly and knowledgeable AI study companion. Keep answers concise, helpful, and encouraging. Use clear formatting when explaining concepts.';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Nexus, your AI Companion. I'm connected to a real AI service now — ask me anything about your studies, homework, or any topic you're curious about.",
};

export default function AiCompanion() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function fetchReply(history: ChatMessage[], userText: string): Promise<string> {
    const apiMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userText },
    ];

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...apiMessages] }),
    });

    const data = (await response.json()) as { content?: string };
    if (!response.ok) throw new Error(`AI service returned ${response.status}`);
    return data.content?.trim() || 'I did not get a response. Could you try again?';
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || loading) return;

    const userMessage: ChatMessage = { id: nextId(), role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setLoading(true);

    try {
      const reply = await fetchReply(messages, content);
      const replyMessage: ChatMessage = { id: nextId(), role: 'assistant', content: reply };
      setMessages((prev) => [...prev, replyMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: 'I had trouble reaching the AI service just now. Please try again in a moment.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl animate-fade-in flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">AI Companion</h1>
        <p className="mt-1.5 text-slate-400">Powered by the OpenRouter free model pool — ask me anything.</p>
        <input
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Optional OpenRouter API key (mock mode without one)"
          className="mt-3 w-full max-w-md rounded-lg border border-slate-700/60 bg-surface-pane px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          autoComplete="off"
        />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-700/60 bg-surface-pane p-4 sm:p-6"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              className={`flex animate-slide-up items-end gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  isUser ? 'bg-blue-500 text-white' : 'bg-surface-elevated text-slate-300'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-br-md bg-blue-500 text-white'
                    : 'rounded-bl-md bg-surface-elevated text-slate-100'
                }`}
              >
                <FormattedMessage content={message.content} />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex animate-slide-up items-end gap-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-elevated text-slate-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-surface-elevated px-4 py-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 flex items-center gap-2 rounded-xl border border-slate-700/60 bg-surface-pane p-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          className="h-11 flex-1 bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!draft.trim() || loading}
          className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
