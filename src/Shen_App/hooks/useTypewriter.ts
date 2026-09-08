'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface UseTypewriterOptions {
  text: string
  speed?: number
  enabled?: boolean
  onComplete?: () => void
}

export function useTypewriter({
  text,
  speed = 15,
  enabled = true,
  onComplete,
}: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const charIndex = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    // If not enabled, show full text immediately
    if (!enabled) {
      setDisplayedText(text)
      setIsTyping(false)
      charIndex.current = text.length
      return
    }

    // If no text, nothing to type
    if (!text) {
      setDisplayedText('')
      setIsTyping(false)
      return
    }

    // Start typing
    charIndex.current = 0
    setDisplayedText('')
    setIsTyping(true)

    // Determine chunk size based on text length for smoother feel
    const chunkSize = text.length > 800 ? 4 : text.length > 400 ? 3 : text.length > 150 ? 2 : 1

    intervalRef.current = setInterval(() => {
      charIndex.current += chunkSize

      if (charIndex.current >= text.length) {
        setDisplayedText(text)
        setIsTyping(false)
        cleanup()
        onCompleteRef.current?.()
      } else {
        setDisplayedText(text.slice(0, charIndex.current))
      }
    }, speed)

    return cleanup
    // Only re-run when text or enabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, enabled])

  return { displayedText, isTyping }
}
