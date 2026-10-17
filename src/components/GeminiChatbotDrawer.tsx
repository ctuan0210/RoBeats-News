import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Loader2, 
  BookOpen, 
  Zap, 
  Cpu, 
  Flame,
  FileCheck2,
  Music
} from 'lucide-react';
import { ChatMessage, ChatRole, TaskComplexity } from '../types';

interface GeminiChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articleContext?: {
    title: string;
    category: string;
    content: string;
  } | null;
  onApplyTextToArticle?: (text: string) => void;
}

const ROLES: { id: ChatRole; title: string; desc: string; icon: any }[] = [
  {
    id: 'editor',
    title: 'Meta Strategist',
    desc: 'Chart difficulties, song tiers & newsroom coverage',
    icon: Music,
  },
  {
    id: 'reporter',
    title: 'Chart Reviewer',
    desc: 'Detailed breakdown of note patterns, jumpstreams & BPM',
    icon: BookOpen,
  },
  {
    id: 'copyeditor',
    title: 'Mission Guide',
    desc: 'Daily & Weekly mission routing, star coin math & gear stats',
    icon: FileCheck2,
  },
  {
    id: 'breaking',
    title: 'Alert Desk',
    desc: 'Flash Song Shop discounts & urgent patch announcements',
    icon: Flame,
  },
];

const TASK_MODELS: { id: TaskComplexity; model: string; label: string; desc: string; icon: any }[] = [
  {
    id: 'complex',
    model: 'gemini-3.1-pro-preview',
    label: 'Complex',
    desc: 'Deep chart analysis & stamina routing (gemini-3.1-pro-preview)',
    icon: Cpu,
  },
  {
    id: 'general',
    model: 'gemini-3.5-flash',
    label: 'General',
    desc: 'Drafting news updates & guides (gemini-3.5-flash)',
    icon: Sparkles,
  },
  {
    id: 'fast',
    model: 'gemini-3.1-flash-lite',
    label: 'Fast',
    desc: 'Quick stats, coin math & short answers (gemini-3.1-flash-lite)',
    icon: Zap,
  },
];

const QUICK_STARTERS = [
  'What are the best songs to grind today’s 300 star mission?',
  'Is Freedom Dive or Galaxy Collapse better for coin farming?',
  'Draft a short announcement for a new 9.5-star song drop',
  'How do I calibrate my note speed to read high BPM jumpstreams?',
];

export const GeminiChatbotDrawer: React.FC<GeminiChatbotDrawerProps> = ({
  isOpen,
  onClose,
  articleContext,
  onApplyTextToArticle,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      content: `Hey! Welcome to the RoBeats AI Assistant.\n\nI can help you analyze song charts, strategize daily mission coin routes, draft news updates, or calculate hit window offsets. What are you looking to play or publish today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<ChatRole>('editor');
  const [taskComplexity, setTaskComplexity] = useState<TaskComplexity>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRoleObj = ROLES.find(r => r.id === selectedRole) || ROLES[0];
  const currentTaskModel = TASK_MODELS.find(t => t.id === taskComplexity) || TASK_MODELS[1];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
          role: selectedRole,
          taskComplexity,
          articleContext: articleContext || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Chat request failed');
      }

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: 'err-' + Date.now(),
        role: 'model',
        content: `Error: Could not reach Gemini model (${err.message || 'Network error'}). Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: currentTaskModel.model,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Clear chat history?')) {
      setMessages([
        {
          id: 'init-reset',
          role: 'model',
          content: `Chat history cleared. How can I assist with RoBeats today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: currentTaskModel.model,
        },
      ]);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[500px] bg-[#0E121B] border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-zinc-100">
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-[#121620] border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 text-black flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>RoBeats AI Assistant</span>
            </h3>
            <div className="text-[10px] text-zinc-400 font-mono-numbers">
              Active: {currentTaskModel.model}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearHistory}
            title="Reset conversation"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Role & Model Selector */}
      <div className="p-3 bg-zinc-900/60 border-b border-zinc-800 space-y-2.5 text-xs">
        {/* Role Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            Assistant Persona
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ROLES.map(role => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  title={role.desc}
                  className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                      : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-zinc-500'}`} />
                    <span className="truncate text-xs">{role.title}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Complexity / Model */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Task Complexity
            </label>
            <span className="text-[10px] text-zinc-500 font-mono">
              {currentTaskModel.model}
            </span>
          </div>

          <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900">
            {TASK_MODELS.map(tm => (
              <button
                key={tm.id}
                onClick={() => setTaskComplexity(tm.id)}
                title={tm.desc}
                className={`flex-1 py-1 px-1.5 text-[11px] font-medium rounded-md transition-all text-center cursor-pointer ${
                  taskComplexity === tm.id
                    ? 'bg-cyan-500 text-black font-bold shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tm.label}
              </button>
            ))}
          </div>
        </div>

        {articleContext && articleContext.title && (
          <div className="px-2.5 py-1.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-[11px] text-cyan-300 flex items-center justify-between">
            <span className="truncate">
              Draft Context: <strong className="font-semibold">{articleContext.title}</strong>
            </span>
            <span className="text-[10px] text-cyan-400 font-mono shrink-0 ml-2">Synced</span>
          </div>
        )}
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono-numbers px-1">
                {isUser ? (
                  <span>You · {msg.timestamp}</span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="font-semibold text-cyan-400">{currentRoleObj.title}</span>
                    <span>·</span>
                    <span className="text-zinc-500">{msg.modelUsed || currentTaskModel.model}</span>
                  </span>
                )}
              </div>

              <div
                className={`p-3.5 rounded-xl max-w-[88%] leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-xs'
                    : 'bg-[#141923] text-zinc-200 border border-zinc-800 rounded-bl-none shadow-xs'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>

                {!isUser && (
                  <div className="mt-2.5 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onApplyTextToArticle && (
                      <button
                        onClick={() => onApplyTextToArticle(msg.content)}
                        className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline cursor-pointer"
                      >
                        Insert to Draft
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-400 text-xs py-2 px-1">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Thinking with {currentTaskModel.model}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starters */}
      {messages.length <= 3 && (
        <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-800">
          <div className="text-[10px] uppercase font-semibold text-zinc-500 mb-1.5 tracking-wider">
            Quick Prompts:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STARTERS.map((st, i) => (
              <button
                key={i}
                onClick={() => handleSend(st)}
                disabled={isLoading}
                className="text-[11px] text-zinc-300 bg-zinc-800/80 border border-zinc-700 hover:border-cyan-500/50 hover:text-white px-2.5 py-1 rounded-lg transition-colors text-left cursor-pointer"
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="p-3 bg-[#121620] border-t border-zinc-800">
        <div className="relative flex items-end rounded-xl border border-zinc-700 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500 bg-zinc-900 p-2 transition-all">
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${currentRoleObj.title}...`}
            className="w-full text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none pr-10 bg-transparent"
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 p-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
