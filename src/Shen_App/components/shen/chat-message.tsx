'use client'

import { useState } from 'react'
import { AnswerBlock, ImageItem, TableItem } from '@/lib/ragService'
import { useTypewriter } from '@/hooks/useTypewriter'
import ThinkingIndicator from './thinking-indicator'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  answerBlocks?: AnswerBlock[]
  images?: ImageItem[]
  tables?: TableItem[]
  route?: 'text' | 'table' | 'image' | 'hybrid'
  reasoning?: string
  sources?: { doc_id: string; page: number; similarity: number }[]
  isThinking?: boolean
  isNew?: boolean
}

// Typewriter wrapper for text content
function TypewriterText({ text, enabled, onComplete }: { text: string; enabled: boolean; onComplete?: () => void }) {
  const { displayedText, isTyping } = useTypewriter({
    text,
    speed: 12,
    enabled,
    onComplete,
  })

  return (
    <>
      {displayedText}
      {isTyping && (
        <span className="inline-block w-[2px] h-[1em] bg-[#00E5FF] ml-0.5 align-middle animate-blink" />
      )}
    </>
  )
}

// Convert Windows path from DB to a URL served by FastAPI /images endpoint
function toImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null
  const normalized = imagePath.replace(/\\/g, '/')
  const marker = 'data/images/'
  const idx = normalized.indexOf(marker)
  if (idx !== -1) {
    const relative = normalized.slice(idx + marker.length)
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/images/${relative}`
  }
  const parts = normalized.split('/')
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/images/${parts[parts.length - 1]}`
}

function RouteIndicator({ route, reasoning }: { route: string; reasoning?: string }) {
  const config: Record<string, { label: string; color: string }> = {
    text:   { label: 'Text',   color: '#60a5fa' },
    table:  { label: 'Table',  color: '#00E5FF' },
    image:  { label: 'Image',  color: '#34d399' },
    hybrid: { label: 'Hybrid', color: '#a78bfa' },
  }
  const c = config[route] || config.text

  return (
    <div className="flex items-center gap-2 mb-3">
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: `${c.color}15`, color: c.color, border: `1px solid ${c.color}30` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
        {c.label} Route
      </span>
      {reasoning && (
        <span className="text-[10px] text-muted-foreground italic truncate max-w-xs">
          {reasoning}
        </span>
      )}
    </div>
  )
}

function InlineImage({ block }: { block: AnswerBlock }) {
  const url = toImageUrl(block.image_path)
  return (
    <div className="my-3 rounded-xl border border-[#00E5FF]/15 bg-gradient-to-b from-[#00E5FF]/5 to-transparent overflow-hidden">
      <div className="aspect-video flex items-center justify-center p-4 bg-black/20">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={block.image_description || 'Retrieved image'}
            className="max-h-full max-w-full object-contain rounded-lg shadow-lg transition-transform duration-300 hover:scale-[1.02]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="text-center text-xs text-muted-foreground">Image not available</div>
        )}
      </div>
      {block.image_description && (
        <div className="px-4 py-2 border-t border-[#00E5FF]/10">
          <p className="text-xs text-foreground/60 italic">{block.image_description}</p>
        </div>
      )}
    </div>
  )
}

function InlineTable({ block }: { block: AnswerBlock }) {
  let rows: string[][] = []
  try {
    if (block.raw_table) rows = JSON.parse(block.raw_table)
  } catch { /* use description fallback */ }

  return (
    <div className="my-3 rounded-xl border border-[#00E5FF]/15 bg-gradient-to-b from-[#00E5FF]/5 to-transparent overflow-hidden">
      {block.table_description && (
        <div className="px-4 py-2.5 border-b border-[#00E5FF]/10">
          <p className="text-xs text-foreground/60 italic">{block.table_description}</p>
        </div>
      )}
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#00E5FF]/10 bg-[#00E5FF]/5">
                {rows[0].map((header, hi) => (
                  <th key={hi} className="px-4 py-2 text-left font-semibold text-foreground/90 whitespace-nowrap text-xs uppercase tracking-wide">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-[#00E5FF]/5 hover:bg-[#00E5FF]/5 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-foreground/80 text-xs">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 text-sm text-muted-foreground">{block.table_description || 'Table data unavailable'}</div>
      )}
    </div>
  )
}

export default function ChatMessage({
  role,
  content,
  answerBlocks,
  images,
  tables,
  route,
  reasoning,
  sources,
  isThinking,
  isNew = false,
}: ChatMessageProps) {
  const [typingDone, setTypingDone] = useState(!isNew)
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-6 animate-fade-in-up">
        <div className="max-w-[75%] px-5 py-3 rounded-2xl rounded-tr-md bg-[var(--chat-user-bg)] border border-[var(--border)] text-sm text-foreground leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-6 animate-fade-in-up">
      <div className="max-w-[85%]">
        {/* Thinking state */}
        {isThinking && (
          <div className="mb-4">
            <ThinkingIndicator />
            <div className="mt-4 w-[400px] h-[250px] rounded-2xl glass animate-pulse-glow" />
          </div>
        )}

        {/* Actual response */}
        {!isThinking && content && (
          <div>
            {route && <RouteIndicator route={route} reasoning={reasoning} />}

            {/* Rich blocks or plain text */}
            {answerBlocks && answerBlocks.length > 0 ? (
              <div className="rich-answer-flow space-y-1">
                {answerBlocks.map((block, i) => {
                  if (block.type === 'text') return (
                    <div key={i} className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap animate-fade-in">
                      <TypewriterText
                        text={block.content || ''}
                        enabled={isNew && !typingDone}
                        onComplete={() => setTypingDone(true)}
                      />
                    </div>
                  )
                  if (block.type === 'image') return (
                    <div key={i} className={`transition-all duration-500 ${typingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <InlineImage block={block} />
                    </div>
                  )
                  if (block.type === 'table') return (
                    <div key={i} className={`transition-all duration-500 ${typingDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                      <InlineTable block={block} />
                    </div>
                  )
                  return null
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                  <TypewriterText
                    text={content}
                    enabled={isNew && !typingDone}
                    onComplete={() => setTypingDone(true)}
                  />
                </div>

                {/* Fallback: render images directly from API response */}
                {images && images.length > 0 && images.map((img, i) => (
                  <InlineImage key={`img-${i}`} block={{
                    type: 'image',
                    image_path: img.image_path,
                    image_description: img.description,
                    doc_id: img.doc_id,
                    page: img.page,
                    similarity: img.similarity,
                  }} />
                ))}

                {/* Fallback: render tables directly from API response */}
                {tables && tables.length > 0 && tables.map((tbl, i) => (
                  <InlineTable key={`tbl-${i}`} block={{
                    type: 'table',
                    raw_table: tbl.raw_table,
                    table_description: tbl.description,
                    doc_id: tbl.doc_id,
                    page: tbl.page,
                    similarity: tbl.similarity,
                  }} />
                ))}
              </div>
            )}

            {/* Source citations — fade in after typing completes */}
            {sources && sources.length > 0 && typingDone && (
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Sources</p>
                <div className="flex flex-wrap gap-1.5">
                  {sources.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--secondary)]
                                 text-[10px] text-muted-foreground hover:text-foreground hover:bg-[var(--secondary)]/80
                                 transition-colors cursor-default"
                    >
                      <span className="font-semibold text-[#00E5FF]">[{i + 1}]</span>
                      {src.doc_id} · p{src.page}
                      <span className="text-[#00E5FF] font-semibold ml-1">{Math.round(src.similarity * 100)}%</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
