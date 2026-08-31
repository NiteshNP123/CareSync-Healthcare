import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Info,
  CalendarDays,
  FileText,
  Pill,
  Stethoscope,
  ShoppingBag,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AIAnalyzingPulse, FadeIn } from '@/components/motion';
import { useLocation } from 'wouter';

interface AssistantSource {
  type: 'CONSULTATION' | 'LAB_REPORT' | 'PRESCRIPTION' | 'APPOINTMENT' | 'ORDER' | 'GENERAL';
  title: string;
  date?: string;
  route: string;
}

interface SuggestedAction {
  label: string;
  actionType: 'NAVIGATE';
  route: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: AssistantSource[];
  suggestedActions?: SuggestedAction[];
  disclaimer?: string;
  timestamp: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome-1',
  sender: 'assistant',
  text: 'Hello Rahul! I am your **CareSync Assistant**. I can help you organize and understand your healthcare records, upcoming visits, test results, and prescriptions.\n\nWhat would you like to review today?',
  suggestedActions: [
    { label: 'Summarize my recent care', actionType: 'NAVIGATE', route: '/app/journey' },
    { label: "What's next in my care?", actionType: 'NAVIGATE', route: '/app/journey' },
    { label: 'Explain my latest report', actionType: 'NAVIGATE', route: '/app/journey' },
    { label: 'My active medications', actionType: 'NAVIGATE', route: '/app/orders' },
  ],
  timestamp: 'Just now',
};

const QUICK_ACTIONS = [
  'Summarize my recent care',
  "What's next?",
  'Explain my latest report',
  'My active medications',
  'Find a doctor',
];

type AssistantStatusState = 'ai_ready' | 'care_available' | 'unavailable';

export function CareSyncAssistant({ isVisible = true }: { isVisible?: boolean }) {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatusState>('care_available');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isVisible) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: text,
          conversationId: 'session-client-active',
          activeRoute: window.location.pathname,
          sessionHistory: messages
            .filter((m) => m.id !== 'welcome-1')
            .slice(-6)
            .map((m) => ({ role: m.sender, text: m.text })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      if (data.provider === 'gemini') {
        setAssistantStatus('ai_ready');
      } else {
        setAssistantStatus('care_available');
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        sources: data.sources,
        suggestedActions: data.suggestedActions,
        disclaimer: data.disclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setAssistantStatus('unavailable');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Assistant temporarily unavailable. Your CareSync records are still securely available.',
          disclaimer:
            'CareSync Assistant provides software-assisted information organization and does not replace professional medical diagnosis or treatment.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetConversation = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleActionClick = (route: string) => {
    setLocation(route);
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
          data-testid="button-open-assistant"
          aria-label="Open CareSync Assistant"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--primary-foreground)/.2)]">
            <Sparkles size={14} className="text-white" />
          </div>
          <span>CareSync Assistant</span>
        </button>
      )}

      {/* 2. SLIDE-OVER ASSISTANT PANEL / DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/35 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col bg-[hsl(var(--card))] shadow-2xl sm:border-l sm:border-[hsl(var(--border))]"
              data-testid="panel-caresync-assistant"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4 bg-[hsl(var(--secondary)/.4)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="font-display text-sm font-bold text-[hsl(var(--foreground))]">
                      CareSync Assistant
                    </div>
                    <div
                      className="flex items-center gap-1.5 text-[.66rem] text-[hsl(var(--muted-foreground))]"
                      data-testid="status-caresync-assistant"
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          assistantStatus === 'ai_ready'
                            ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                            : assistantStatus === 'care_available'
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span>
                        {assistantStatus === 'ai_ready'
                          ? 'AI assistant ready · Connected to your records'
                          : assistantStatus === 'care_available'
                          ? 'Care assistant available · Connected to your records'
                          : 'Assistant temporarily unavailable'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleResetConversation}
                    className="btn-ghost p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    title="Reset Conversation"
                    data-testid="button-reset-assistant"
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="btn-ghost p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                    data-testid="button-close-assistant"
                    aria-label="Close Assistant"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Quick Actions Scroll Bar */}
              <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.2)] px-4 py-2.5">
                <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleSendMessage(action)}
                      disabled={isLoading}
                      className="shrink-0 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-2.5 py-1 text-[.68rem] font-semibold text-[hsl(var(--muted-foreground))] transition-all hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] active:scale-95 disabled:opacity-50"
                      data-testid={`chip-quick-action-${action.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-3.5 leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium rounded-br-xs'
                          : 'border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] text-[hsl(var(--foreground))] rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Source Traceability Badges */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-3 border-t border-[hsl(var(--border))] pt-2.5 space-y-1.5">
                          <div className="text-[.64rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                            Based on your records:
                          </div>
                          {msg.sources.map((src) => (
                            <button
                              key={src.title + src.route}
                              onClick={() => handleActionClick(src.route)}
                              className="flex items-center justify-between w-full rounded-lg bg-[hsl(var(--card))] px-2.5 py-1.5 text-left text-[.68rem] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] transition-colors"
                            >
                              <span className="truncate font-semibold flex items-center gap-1.5">
                                {src.type === 'APPOINTMENT' ? (
                                  <CalendarDays size={12} className="text-[hsl(var(--primary))]" />
                                ) : src.type === 'LAB_REPORT' ? (
                                  <FileText size={12} className="text-[hsl(var(--accent))]" />
                                ) : (
                                  <Pill size={12} className="text-amber-600" />
                                )}
                                {src.title}
                              </span>
                              <ChevronRight size={12} className="text-[hsl(var(--muted-foreground))] shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Suggested Actions */}
                      {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((act) => (
                            <button
                              key={act.label + act.route}
                              onClick={() => handleActionClick(act.route)}
                              className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/.1)] px-2.5 py-1 text-[.66rem] font-bold text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/.2)] transition-colors"
                            >
                              {act.label} <ArrowUpRight size={10} />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Disclaimer footer */}
                      {msg.disclaimer && (
                        <div className="mt-2.5 text-[.6rem] leading-tight text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-2">
                          {msg.disclaimer}
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-[.6rem] text-[hsl(var(--muted-foreground))] px-1">
                      {msg.timestamp}
                    </div>
                  </div>
                ))}

                {/* Loading State */}
                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-3.5 text-xs text-[hsl(var(--muted-foreground))]">
                      <AIAnalyzingPulse label="Reviewing your CareSync records..." />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-[hsl(var(--border))] p-3 bg-[hsl(var(--card))]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask about your care, reports, medications..."
                    className="field flex-1 text-xs h-10 px-3.5"
                    disabled={isLoading}
                    data-testid="input-assistant-message"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="btn-primary h-10 px-3 shrink-0"
                    data-testid="button-send-assistant-message"
                    aria-label="Send message"
                  >
                    <Send size={14} />
                  </button>
                </form>
                <div className="mt-2 text-center text-[.62rem] text-[hsl(var(--muted-foreground))]">
                  Informational assistant · Always verify clinical advice with your physician.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
