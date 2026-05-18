'use client'

import { useCallback, useEffect, useRef } from 'react'

const POOL_SIZE = 16
const ANIMATION_DURATION_MS = 700

export interface PopupController {
  spawn: (text: string, clientX: number, clientY: number) => void
}

interface Props {
  controllerRef: React.RefObject<PopupController | null>
}

export function PlusPopup({ controllerRef }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const slotsRef = useRef<HTMLSpanElement[]>([])
  const cursorRef = useRef(0)

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el
    if (!el) {
      slotsRef.current = []
      return
    }
    el.innerHTML = ''
    const slots: HTMLSpanElement[] = []
    for (let i = 0; i < POOL_SIZE; i++) {
      const slot = document.createElement('span')
      slot.className = 'plus-popup'
      slot.style.position = 'absolute'
      slot.style.pointerEvents = 'none'
      slot.style.opacity = '0'
      slot.style.willChange = 'transform, opacity'
      el.appendChild(slot)
      slots.push(slot)
    }
    slotsRef.current = slots
  }, [])

  useEffect(() => {
    const controller: PopupController = {
      spawn(text, clientX, clientY) {
        const container = containerRef.current
        const slots = slotsRef.current
        if (!container || slots.length === 0) return
        const rect = container.getBoundingClientRect()
        const cursor = cursorRef.current
        cursorRef.current = (cursor + 1) % POOL_SIZE
        const slot = slots[cursor]
        if (!slot) return

        slot.textContent = text
        slot.classList.remove('plus-popup-active')
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        slot.offsetWidth // reflow to restart the animation
        slot.style.left = `${String(clientX - rect.left)}px`
        slot.style.top = `${String(clientY - rect.top)}px`
        slot.classList.add('plus-popup-active')
      },
    }
    controllerRef.current = controller
    return () => {
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }, [controllerRef])

  return (
    <div
      ref={setContainer}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 50,
      }}
    />
  )
}

PlusPopup.ANIMATION_DURATION_MS = ANIMATION_DURATION_MS
