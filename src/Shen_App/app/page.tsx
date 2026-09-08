"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useDocuments, useIndexFiles, useHealth } from "@/hooks/useRAG";
import { getCorpusStatus, CorpusStatus, QueryResponse } from "@/lib/ragService";
import Sidebar from "@/components/shen/sidebar";
import WelcomeView from "@/components/shen/welcome-view";
import ChatMessage from "@/components/shen/chat-message";
import ChatInput from "@/components/shen/chat-input";

// ── Types ────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  answerBlocks?: QueryResponse["answer_blocks"];
  images?: QueryResponse["images"];
  tables?: QueryResponse["tables"];
  route?: QueryResponse["route"];
  reasoning?: string;
  sources?: { doc_id: string; page: number; similarity: number }[];
  isThinking?: boolean;
  timestamp: number;
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

// ── Helpers ──────────────────────────────────────────────
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadChats(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("shen-chats");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("shen-chats", JSON.stringify(chats));
}

// ── Main Component ───────────────────────────────────────
export default function Home() {
  // Chat state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Backend state
  const [corpusStatus, setCorpusStatus] = useState<CorpusStatus | null>(null);
  const { isOnline } = useHealth();
  const { documents, loading: docsLoading, refetch: refetchDocs } = useDocuments();
  const { submit, result, loading: queryLoading, error } = useQuery();
  const { upload, loading: uploading } = useIndexFiles(refetchDocs);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingQueryRef = useRef<string | null>(null);

  // Load chats from localStorage on mount
  useEffect(() => {
    setChats(loadChats());
  }, []);

  // Save chats whenever they change
  useEffect(() => {
    if (chats.length > 0) saveChats(chats);
  }, [chats]);

  // Fetch corpus status
  useEffect(() => {
    getCorpusStatus().then(setCorpusStatus).catch(() => {});
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeChatId, queryLoading]);

  // Active chat
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // Handle query result
  useEffect(() => {
    if (result && !queryLoading && activeChatId && pendingQueryRef.current) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat;
          // Remove thinking message and add real response
          const withoutThinking = chat.messages.filter((m) => !m.isThinking);
          const newMsg: Message = {
            id: generateId(),
            role: "assistant",
            content: result.answer,
            answerBlocks: result.answer_blocks,
            images: result.images,
            tables: result.tables,
            route: result.route,
            reasoning: result.reasoning,
            sources: result.sources.map((s) => ({
              doc_id: s.doc_id,
              page: s.page,
              similarity: s.similarity,
            })),
            timestamp: Date.now(),
          };
          return { ...chat, messages: [...withoutThinking, newMsg] };
        })
      );
      pendingQueryRef.current = null;
    }
  }, [result, queryLoading, activeChatId]);

  // Handle query error
  useEffect(() => {
    if (error && !queryLoading && activeChatId) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== activeChatId) return chat;
          const withoutThinking = chat.messages.filter((m) => !m.isThinking);
          const errMsg: Message = {
            id: generateId(),
            role: "assistant",
            content: `Error: ${error}`,
            timestamp: Date.now(),
          };
          return { ...chat, messages: [...withoutThinking, errMsg] };
        })
      );
      pendingQueryRef.current = null;
    }
  }, [error, queryLoading, activeChatId]);

  // ── Actions ────────────────────────────────────────────
  const createNewChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: "New Chat",
      messages: [],
      timestamp: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      let chatId = activeChatId;

      // Create new chat if none active
      if (!chatId) {
        const newChat: Chat = {
          id: generateId(),
          title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
          messages: [],
          timestamp: Date.now(),
        };
        setChats((prev) => [newChat, ...prev]);
        chatId = newChat.id;
        setActiveChatId(chatId);
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };

      const thinkingMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        isThinking: true,
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          const updatedTitle =
            chat.messages.length === 0
              ? text.slice(0, 50) + (text.length > 50 ? "..." : "")
              : chat.title;
          return {
            ...chat,
            title: updatedTitle,
            messages: [...chat.messages, userMsg, thinkingMsg],
            timestamp: Date.now(),
          };
        })
      );

      pendingQueryRef.current = text;
      submit(text);
    },
    [activeChatId, submit]
  );

  const deleteChat = useCallback(
    (chatId: string) => {
      setChats((prev) => {
        const updated = prev.filter((c) => c.id !== chatId);
        if (updated.length === 0) {
          localStorage.removeItem("shen-chats");
        }
        return updated;
      });
      if (activeChatId === chatId) {
        setActiveChatId(null);
      }
    },
    [activeChatId]
  );

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) upload(e.target.files);
  };

  // ── Build sidebar data ─────────────────────────────────
  const recentChats = chats.map((c) => ({
    id: c.id,
    title: c.title,
    timestamp: new Date(c.timestamp).toLocaleString(),
  }));

  const workspaces = documents.slice(0, 5).map((doc) => ({
    id: doc.doc_id,
    name: doc.doc_id,
    count: doc.text_chunks + doc.table_chunks + doc.image_chunks,
  }));

  // ── Build catalog data for welcome view ────────────────
  const catalogs = documents.length > 0 ? [{
    name: corpusStatus?.corpus_name || "Document Collection",
    chatCount: chats.length,
    updatedAgo: "recently",
    tags: ["RAG", "Multimodal", "Documents"],
    recentThreads: chats.slice(0, 2).map(c => ({
      title: c.title,
      time: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })),
  }] : [];

  // ── View state ─────────────────────────────────────────
  const showWelcome = !activeChatId;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        recentChats={recentChats}
        workspaces={workspaces}
        activeChatId={activeChatId}
        onNewChat={createNewChat}
        onSelectChat={setActiveChatId}
        onDeleteChat={deleteChat}
        onUpload={handleUpload}
        uploading={uploading}
        userName="Nandun Samarasekara"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {showWelcome ? (
          <>
            <WelcomeView
              isOnline={isOnline}
              onQuickStart={sendMessage}
            />
            <div className="px-4 pb-6">
              <ChatInput
                onSend={sendMessage}
                onUpload={handleUpload}
                uploading={uploading}
              />
            </div>
          </>
        ) : (
          <>
            {/* Chat header bar */}
            <div className="h-12 flex items-center justify-between px-6 border-b border-[var(--border)] flex-shrink-0">
              <div className="flex items-center gap-3">
                {activeChat && (
                  <h2 className="text-sm font-medium text-foreground truncate max-w-md">
                    {activeChat.title}
                  </h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {activeChat?.messages.filter(m => m.role === 'user').length || 0} messages
                </span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-3xl mx-auto">
                {activeChat?.messages.map((msg, idx) => {
                  const isLastAssistant = msg.role === 'assistant' && !msg.isThinking &&
                    idx === activeChat.messages.length - 1
                  return (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    answerBlocks={msg.answerBlocks}
                    images={msg.images}
                    tables={msg.tables}
                    route={msg.route}
                    reasoning={msg.reasoning}
                    sources={msg.sources}
                    isThinking={msg.isThinking}
                    isNew={isLastAssistant && msg.content.length > 0}
                  />
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Chat input */}
            <div className="px-4 pb-6 pt-2">
              <ChatInput
                onSend={sendMessage}
                onUpload={handleUpload}
                uploading={uploading}
                disabled={queryLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}