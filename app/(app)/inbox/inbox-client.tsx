"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Send,
  Loader2,
  Check,
  CheckCheck,
  Download,
  Clock,
  ExternalLink,
  RefreshCw,
  Bot,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import {
  getConversations,
  getChatMessages,
  sendChatMessage,
  sendChatTemplate,
  assignConversation,
  toggleBotTakeover,
  approveDraft,
  discardDraft,
} from "./actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Conversation = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Message = any;

interface Agent {
  id: string;
  name: string;
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

function Ticks({ m }: { m: Message }) {
  if (m.direction !== "OUTBOUND") return null;
  if (m.status === "FAILED") return <span className="text-red-500 text-[10px] font-semibold">failed</span>;
  if (m.read_at || m.status === "OPENED") return <CheckCheck className="size-3.5 text-sky-500" />;
  if (m.delivered_at || m.status === "DELIVERED") return <CheckCheck className="size-3.5 text-gray-400" />;
  return <Check className="size-3.5 text-gray-400" />;
}

export default function InboxClient({
  initialConversations,
  agents,
  isAdmin,
  companyId,
}: {
  initialConversations: Conversation[];
  agents: Agent[];
  isAdmin: boolean;
  companyId: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeLead, setActiveLead] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowExpiresAt, setWindowExpiresAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [humanTakeover, setHumanTakeover] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [aiDraft, setAiDraft] = useState<{ id: string; draft_text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeLeadRef = useRef<string | null>(null);
  activeLeadRef.current = activeLead;

  const activeConv = useMemo(
    () => conversations.find((c) => c.lead_id === activeLead) || null,
    [conversations, activeLead]
  );

  const refreshConversations = useCallback(() => {
    startTransition(async () => {
      const res = await getConversations();
      setConversations(res.conversations);
    });
  }, []);

  const openConversation = useCallback(async (leadId: string) => {
    setActiveLead(leadId);
    setLoadingThread(true);
    setMessages([]);
    try {
      const res = await getChatMessages(leadId);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setMessages(res.messages || []);
      setWindowOpen(!!res.windowOpen);
      setWindowExpiresAt(res.windowExpiresAt || null);
      setHumanTakeover(!!res.botState?.humanTakeover);
      setOptedOut(!!res.botState?.optedOut);
      setAiDraft(res.pendingDraft || null);
      setConversations((prev) =>
        prev.map((c) => (c.lead_id === leadId ? { ...c, unread_count: 0 } : c))
      );
    } finally {
      setLoadingThread(false);
    }
  }, []);

  // Auto-scroll to newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Realtime: new WhatsApp messages appear live ──
  useEffect(() => {
    if (!companyId) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`inbox:${companyId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "message_log", filter: `company_id=eq.${companyId}` },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const m = payload.new;
            if (m.channel !== "WHATSAPP") return;
            // Append to the open thread if it matches.
            if (m.lead_id && m.lead_id === activeLeadRef.current) {
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
              if (m.direction === "INBOUND") {
                setWindowOpen(true);
                setWindowExpiresAt(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
              }
            }
            // Refresh the list (previews, unread, ordering).
            refreshConversations();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "message_log", filter: `company_id=eq.${companyId}` },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const m = payload.new;
            if (m.channel !== "WHATSAPP") return;
            if (m.lead_id && m.lead_id === activeLeadRef.current) {
              setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...m } : x)));
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "ai_drafts", filter: `company_id=eq.${companyId}` },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            const d = payload.new;
            if (d.status === "PENDING" && d.lead_id === activeLeadRef.current) {
              setAiDraft({ id: d.id, draft_text: d.draft_text });
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [companyId, refreshConversations]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !activeLead) return;
    setSending(true);
    try {
      const res = await sendChatMessage(activeLead, text);
      if (res.error) {
        if (res.windowClosed) setWindowOpen(false);
        toast.error(res.error);
        return;
      }
      setDraft("");
      // Optimistic append (realtime will reconcile).
      setMessages((prev) => [
        ...prev,
        {
          id: res.id || `tmp-${Date.now()}`,
          direction: "OUTBOUND",
          body: text,
          status: "SENT",
          is_auto: false,
          created_at: res.createdAt || new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleSendTemplate() {
    if (!activeLead) return;
    setSending(true);
    try {
      const res = await sendChatTemplate(activeLead);
      if (res.error) toast.error(res.error);
      else toast.success("Template sent — the conversation re-opens when they reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleTakeover(take: boolean) {
    if (!activeLead) return;
    const res = await toggleBotTakeover(activeLead, take);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setHumanTakeover(take);
    toast.success(take ? "You've taken over — the AI is silent on this chat." : "Handed back to the AI.");
  }

  async function handleDraftSend() {
    if (!activeLead || !aiDraft) return;
    setSending(true);
    try {
      const res = await approveDraft(aiDraft.id, activeLead, aiDraft.draft_text);
      if (res.error) {
        if ("windowClosed" in res && res.windowClosed) setWindowOpen(false);
        toast.error(res.error);
        return;
      }
      setAiDraft(null);
    } finally {
      setSending(false);
    }
  }

  async function handleDraftDiscard(keepText?: boolean) {
    if (!aiDraft) return;
    if (keepText) setDraft(aiDraft.draft_text);
    const id = aiDraft.id;
    setAiDraft(null);
    await discardDraft(id);
  }

  function handleAssign(leadId: string, agentId: string) {
    startTransition(async () => {
      const res = await assignConversation(leadId, agentId === "none" ? null : agentId);
      if (res.error) toast.error(res.error);
      else {
        toast.success(agentId === "none" ? "Unassigned" : "Conversation assigned");
        refreshConversations();
      }
    });
  }

  const windowTimeLeft =
    windowOpen && windowExpiresAt
      ? formatDistanceToNow(new Date(windowExpiresAt))
      : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-lg border bg-card overflow-hidden">
      {/* ── Conversation list ── */}
      <div className="w-full sm:w-80 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageCircle className="size-4 text-[#25D366]" /> Live Chat
          </h2>
          <button onClick={refreshConversations} className="p-1.5 rounded hover:bg-muted" aria-label="Refresh">
            <RefreshCw className={`size-3.5 text-muted-foreground ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">
                {isAdmin
                  ? "When a lead replies on WhatsApp, the chat appears here."
                  : "Chats assigned to you will appear here."}
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.lead_id)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors ${
                  activeLead === c.lead_id ? "bg-muted/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.leads?.name || c.phone || "Lead"}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {c.last_message_at ? formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true }) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{c.last_message_preview || "—"}</p>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] rounded-full bg-[#25D366] text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  )}
                </div>
                {isAdmin && c.assigned_agent?.name && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">→ {c.assigned_agent.name}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Thread ── */}
      <div className="hidden sm:flex flex-1 flex-col min-w-0">
        {!activeLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageCircle className="size-10 opacity-30" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{activeConv?.leads?.name || "Lead"}</span>
                  <Link
                    href={`/leads/${activeLead}`}
                    prefetch={false}
                    className="text-muted-foreground hover:text-primary"
                    title="Open lead"
                  >
                    <ExternalLink className="size-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">{activeConv?.phone || ""}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {optedOut ? (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Bot className="size-3" /> Opted out
                  </Badge>
                ) : (
                  <button
                    onClick={() => handleTakeover(!humanTakeover)}
                    className={`h-8 inline-flex items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors ${
                      humanTakeover
                        ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                        : "bg-background text-gray-700 hover:bg-gray-100"
                    }`}
                    title={
                      humanTakeover
                        ? "The AI is silent on this chat — click to hand it back"
                        : "Click to take over from the AI on this chat"
                    }
                  >
                    <Bot className="size-3.5" />
                    {humanTakeover ? "Hand back to AI" : "Take over"}
                  </button>
                )}
                {windowOpen ? (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 text-[10px]">
                    <Clock className="size-3" /> Reply window: {windowTimeLeft} left
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Clock className="size-3" /> Window closed
                  </Badge>
                )}
                {isAdmin && (
                  <select
                    value={activeConv?.assigned_agent_id || "none"}
                    onChange={(e) => handleAssign(activeLead, e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    title="Assign this conversation"
                  >
                    <option value="none">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ backgroundColor: "#f0ede8" }}>
              {loadingThread ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                messages.map((m, i) => {
                  const showDay =
                    i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
                  const out = m.direction === "OUTBOUND";
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <div className="flex justify-center my-3">
                          <span className="text-[10px] font-semibold text-gray-500 bg-white/80 rounded-full px-3 py-1 shadow-sm">
                            {dayLabel(m.created_at)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm text-sm leading-relaxed ${
                            out ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-gray-800">
                            {m.body || m.subject}
                          </p>
                          {m.media_id && (
                            <a
                              href={`/api/whatsapp/media/${m.media_id}`}
                              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#00A5F4] hover:underline"
                            >
                              <Download className="size-3.5" /> Download {m.media_type || "file"}
                            </a>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            {out && m.source === "BOT" ? (
                              <span className="text-[9px] font-semibold text-gray-500 uppercase inline-flex items-center gap-0.5">
                                <Sparkles className="size-2.5" /> AI
                              </span>
                            ) : m.is_auto && out ? (
                              <span className="text-[9px] text-gray-400 uppercase">auto</span>
                            ) : null}
                            <span className="text-[10px] text-gray-400">
                              {format(new Date(m.created_at), "h:mm a")}
                            </span>
                            <Ticks m={m} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t p-3">
              {aiDraft && windowOpen && (
                <div className="mb-2 rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                    <Sparkles className="size-3.5" /> AI suggested reply
                    <button
                      onClick={() => handleDraftDiscard()}
                      className="ml-auto p-0.5 rounded hover:bg-gray-200"
                      aria-label="Discard suggestion"
                    >
                      <X className="size-3.5 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{aiDraft.draft_text}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="h-7 text-xs" onClick={handleDraftSend} disabled={sending}>
                      {sending ? <Loader2 className="size-3 animate-spin mr-1" /> : <Send className="size-3 mr-1" />}
                      Send
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDraftDiscard(true)}
                    >
                      Edit first
                    </Button>
                  </div>
                </div>
              )}
              {windowOpen ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message…"
                    className="h-10"
                    disabled={sending}
                  />
                  <Button onClick={handleSend} disabled={sending || !draft.trim()} className="h-10 bg-[#25D366] hover:bg-[#1ebe5d] text-white">
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-md bg-muted/40 border px-3 py-2.5">
                  <p className="text-xs text-muted-foreground flex-1">
                    The 24-hour reply window is closed (WhatsApp rule). Send your approved template to
                    re-open the conversation — it unlocks when the lead replies.
                  </p>
                  <Button size="sm" variant="outline" onClick={handleSendTemplate} disabled={sending}>
                    {sending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Send className="mr-1.5 size-3.5" />}
                    Send template
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
