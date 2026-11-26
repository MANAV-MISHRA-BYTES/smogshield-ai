"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, MessageSquare, Send, Sparkles } from "lucide-react";
import type {
  ChatApiResponse,
  ChatMessage,
  HouseholdProfile,
  LiveAqiData,
  SmogActionPlan,
} from "@/types";

interface SmogChatAssistantProps {
  aqiData: LiveAqiData | null;
  profile: HouseholdProfile;
  plan: SmogActionPlan | null;
}

/**
 * Grounded AI Q&A assistant answering winter smog, exposure, and household safety questions.
 */
export function SmogChatAssistant({
  aqiData,
  profile,
  plan,
}: SmogChatAssistantProps) {
  const headingId = useId();
  const inputId = useId();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"gemini" | "demo" | null>(null);

  const starterPrompts = useMemo(() => {
    const cityName = aqiData?.location.name ?? "my city";
    const hasKids = profile.vulnerableMembers.includes("children");
    return [
      hasKids
        ? `Is it safe to take my 5-year-old to the park at 4 PM today in ${cityName}?`
        : `When is the safest 45-minute window for outdoor exercise today in ${cityName}?`,
      `Should I open windows tonight in ${cityName} or run DIY filtration?`,
      "How do I assemble an effective DIY Corsi-Rosenthal box on a tight budget?",
    ];
  }, [aqiData?.location.name, profile.vulnerableMembers]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || !aqiData || isSending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          aqiData,
          profile,
          planSummary: plan?.winterSmogOutlook,
        }),
      });

      const payload = (await res.json()) as Partial<ChatApiResponse> & {
        error?: string;
      };

      if (!res.ok || !payload.reply) {
        throw new Error(
          payload.error ?? "Unable to reach the SmogShield AI assistant.",
        );
      }

      setMode(payload.mode ?? "demo");
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: payload.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError((err as Error).message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id={headingId}
            className="flex items-center gap-2 text-lg font-bold text-slate-50"
          >
            <MessageSquare
              className="h-5 w-5 text-cyan-400"
              aria-hidden="true"
            />
            AI Smog Q&amp;A Assistant
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Ask real-time follow-ups grounded in{" "}
            <strong className="text-slate-100">
              {aqiData ? `${aqiData.location.name} (AQI ${aqiData.current.usAqi})` : "live AQI"}
            </strong>{" "}
            and your household profile.
          </p>
        </div>

        {mode && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
            {mode === "gemini" ? "Gemini 2.5 Flash" : "Demo Assistant"}
          </span>
        )}
      </div>

      {/* Starter Prompt Chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {starterPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={!aqiData || isSending}
            onClick={() => void sendQuestion(prompt)}
            className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-left text-xs font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation Log */}
      <div
        aria-live="polite"
        className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/75 p-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">
            Try clicking a prompt above or ask about outdoor safety times, masks
            (N95/KN95 fit), cooking fumes, or school commute options.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {msg.role === "user" ? "You" : "SmogShield AI"}
              </span>
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-cyan-500/20 text-cyan-50 border border-cyan-500/40"
                    : "bg-slate-900 text-slate-200 border border-slate-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Checking live pollutant levels and household guidance...
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-300">
          {error}
        </p>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="mt-3 flex gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          Ask a question about current smog conditions
        </label>
        <input
          id={inputId}
          type="text"
          maxLength={400}
          value={input}
          disabled={!aqiData || isSending}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask e.g. 'Is an N95 mask needed for a 20-minute scooter ride?'"
          className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!aqiData || isSending || input.trim().length < 2}
          aria-label="Send question to SmogShield AI"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </form>
    </section>
  );
}
