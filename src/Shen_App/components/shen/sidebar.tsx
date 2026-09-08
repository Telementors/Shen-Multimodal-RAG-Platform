'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Search,
  MessageSquare,
  FolderOpen,
  ChevronRight,
  Info,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Trash2,
} from 'lucide-react'

interface ChatItem {
  id: string
  title: string
  timestamp: string
}

interface WorkspaceItem {
  id: string
  name: string
  count?: number
}

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  recentChats: ChatItem[]
  workspaces: WorkspaceItem[]
  activeChatId: string | null
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onDeleteChat?: (id: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
  userName: string
}

export default function Sidebar({
  isOpen,
  onToggle,
  recentChats,
  workspaces,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  userName,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) {
    return (
      <div className="w-0 md:w-14 flex-shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col items-center py-4 gap-4">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors text-muted-foreground hover:text-foreground"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      </div>
    )
  }

  const filteredChats = recentChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <aside className="w-[260px] flex-shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-full">
      {/* Header - Logo */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[var(--border)] shadow-lg shadow-cyan-500/10 flex-shrink-0">
            <Image
              src="/avatar.png"
              alt="Shen"
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Shen Ultra</span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors text-muted-foreground hover:text-foreground"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     bg-gradient-to-r from-[#00E5FF] to-[#00BCD4]
                     text-[#0a0e1a] font-semibold text-sm
                     hover:shadow-lg hover:shadow-cyan-500/25 transition-all duration-200
                     active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--sidebar-hover)] border border-[var(--sidebar-border)]">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads, workspaces..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Workspaces & Catalogs */}
      {workspaces.length > 0 && (
        <div className="px-3 pt-4">
          <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            Workspaces and Catalogs
          </p>
          <div className="space-y-0.5">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                           text-sm text-foreground/80 hover:bg-[var(--sidebar-hover)]
                           hover:text-foreground transition-colors group"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground group-hover:text-[#00E5FF] transition-colors" />
                <span className="flex-1 text-left truncate">{ws.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Chats */}
      <div className="px-3 pt-4 flex-1 overflow-hidden flex flex-col">
        <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
          Recent Chats
        </p>
        <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
          {filteredChats.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 px-2 py-4 text-center">
              No chats yet
            </p>
          ) : (
            filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group cursor-pointer ${
                  activeChatId === chat.id
                    ? 'bg-[var(--sidebar-active)] text-foreground border border-[#00E5FF]/20'
                    : 'text-foreground/70 hover:bg-[var(--sidebar-hover)] hover:text-foreground'
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <MessageSquare className={`w-4 h-4 flex-shrink-0 ${
                  activeChatId === chat.id ? 'text-[#00E5FF]' : 'text-muted-foreground'
                }`} />
                <span className="flex-1 text-left truncate">{chat.title}</span>
                {onDeleteChat && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteChat(chat.id)
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150 text-muted-foreground"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* About Footer */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)]">
        <Link
          href="/about"
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[var(--sidebar-hover)] transition-colors group"
        >
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)] flex-shrink-0">
            <Image
              src="/avatar.png"
              alt="Shen"
              width={28}
              height={28}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="flex-1 text-sm text-foreground/80 group-hover:text-foreground transition-colors">About Shen</span>
          <Info className="w-4 h-4 text-muted-foreground group-hover:text-[#00E5FF] transition-colors" />
        </Link>
      </div>
    </aside>
  )
}
