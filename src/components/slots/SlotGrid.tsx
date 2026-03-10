"use client"

import { useCallback } from "react"
import { useProjectStore } from "@/stores/project-store"
import { SlotButton } from "./SlotButton"

export function SlotGrid() {
  const { currentPage, slotMode, assignSlot, removeSlot, getPageSlots } =
    useProjectStore()

  const slots = getPageSlots(currentPage)

  const handleTap = useCallback(
    (slotNum: number) => {
      assignSlot(slotNum)
    },
    [assignSlot]
  )

  const handleLongPress = useCallback(
    (slotNum: number) => {
      removeSlot(slotNum)
    },
    [removeSlot]
  )

  const cols = slotMode === 4 ? 2 : 3

  return (
    <div
      className="grid gap-1.5 px-2 py-1.5"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {slots.map((slot, idx) => (
        <SlotButton
          key={`${currentPage}-${idx + 1}`}
          slotNum={idx + 1}
          assignment={slot}
          onTap={handleTap}
          onLongPress={handleLongPress}
        />
      ))}
    </div>
  )
}
