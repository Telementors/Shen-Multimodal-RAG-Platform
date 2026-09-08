'use client'

interface WelcomeViewProps {
  isOnline: boolean
  onQuickStart?: (prompt: string) => void
  onSearch?: (query: string) => void
}

export default function WelcomeView({
  isOnline,
}: WelcomeViewProps) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top right status badge */}
      <div className="w-full flex justify-end items-center px-8 pt-6 pb-2 flex-shrink-0">
        <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00E5FF] animate-pulse' : 'bg-red-500'}`} />
          <span className={isOnline ? 'text-[#00E5FF]/80' : 'text-red-500'}>
            {isOnline ? 'System Engine Active' : 'System Offline'}
          </span>
        </span>
      </div>

      {/* Middle content centered */}
      <div className="flex-1 flex flex-col items-center w-full max-w-3xl mx-auto px-4 justify-center pb-28 -translate-y-4">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text text-center leading-tight tracking-tight">
          Welcome to Shen&apos;s World
        </h1>
      </div>
    </div>
  )
}
