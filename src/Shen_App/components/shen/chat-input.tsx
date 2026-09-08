'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip, ArrowUp } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploading: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, onUpload, uploading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="relative glass rounded-2xl overflow-hidden glow-border transition-all duration-300 focus-within:shadow-[0_0_0_1px_rgba(0,229,255,0.4),0_0_30px_-3px_rgba(0,229,255,0.2)]">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Shen anything, or drop documents to initiate a new catalog..."
          rows={1}
          disabled={disabled}
          className="w-full bg-transparent text-foreground placeholder-muted-foreground
                     px-5 pt-4 pb-12 text-sm leading-relaxed
                     focus:outline-none resize-none min-h-[56px]
                     disabled:opacity-50"
        />

        {/* Bottom toolbar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Upload PDF"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={onUpload}
              disabled={uploading}
            />

            {/* Model badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">Shen Ultra 2.4</span>
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || disabled}
            className="p-2 rounded-lg bg-[#00E5FF] text-[#0a0e1a] hover:bg-[#00D4E5]
                       disabled:bg-[var(--sidebar-hover)] disabled:text-muted-foreground
                       transition-all duration-200 active:scale-95"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {uploading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-[#00E5FF]">
          <div className="w-3 h-3 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
          <span>Indexing documents...</span>
        </div>
      )}
    </div>
  )
}
