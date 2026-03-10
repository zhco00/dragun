"use client"

import { useRef, useCallback } from "react"
import type { SlotAssignment } from "@/types/project"

interface SlotButtonProps {
  readonly slotNum: number
  readonly assignment: SlotAssignment | null
  readonly onTap: (slotNum: number) => void
  readonly onLongPress: (slotNum: number) => void
}

export function SlotButton({ slotNum, assignment, onTap, onLongPress }: SlotButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPress = useRef(false)

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false
    timerRef.current = setTimeout(() => {
      isLongPress.current = true
      onLongPress(slotNum)
    }, 500)
  }, [slotNum, onLongPress])

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!isLongPress.current) {
      onTap(slotNum)
    }
  }, [slotNum, onTap])

  const handleTouchCancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return (
    <button
      className={`relative aspect-[3/2] rounded-lg border-2 flex items-center justify-center overflow-hidden transition-colors
        ${assignment
          ? "border-blue-500 bg-white"
          : "border-neutral-300 bg-neutral-50 active:bg-blue-50"
        }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchCancel}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress(slotNum)
      }}
    >
      {assignment ? (
        <img
          src={assignment.thumbnailUrl}
          alt={`슬롯 ${slotNum}`}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="text-2xl font-bold text-neutral-400">{slotNum}</span>
      )}
    </button>
  )
}
