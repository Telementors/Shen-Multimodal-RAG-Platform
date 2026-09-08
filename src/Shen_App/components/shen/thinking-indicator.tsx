'use client'

export default function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 animate-fade-in-up">
      <div className="thinking-bars">
        <span /><span /><span /><span /><span /><span /><span />
      </div>
      <span className="text-lg font-semibold text-foreground tracking-tight">
        Thinking<span className="animate-pulse">...</span>
      </span>
    </div>
  )
}
