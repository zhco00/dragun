"use client"

import { useState, useCallback } from "react"
import { useProjectStore } from "@/stores/project-store"

interface PageNavigatorProps {
  readonly onMenuOpen: () => void
}

export function PageNavigator({ onMenuOpen }: PageNavigatorProps) {
  const { currentPage, changePage, setCurrentPage, persistSession } =
    useProjectStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")

  const handlePageClick = useCallback(() => {
    setEditValue(String(currentPage))
    setIsEditing(true)
  }, [currentPage])

  const handlePageSubmit = useCallback(() => {
    const page = parseInt(editValue, 10)
    if (!isNaN(page) && page >= 1) {
      setCurrentPage(page)
    }
    setIsEditing(false)
  }, [editValue, setCurrentPage])

  const handleSave = useCallback(async () => {
    await persistSession()
    alert("저장 완료")
  }, [persistSession])

  return (
    <div className="flex items-center justify-between bg-neutral-100 border-t border-neutral-300 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center active:bg-blue-700 text-lg font-bold"
          onClick={() => changePage(-1)}
        >
          &#9660;
        </button>

        {isEditing ? (
          <input
            type="number"
            className="w-16 h-10 text-center text-xl font-bold bg-white border-2 border-blue-500 rounded-lg"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handlePageSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handlePageSubmit()
            }}
            autoFocus
            min={1}
          />
        ) : (
          <button
            className="w-16 h-10 text-center text-xl font-bold bg-white border border-neutral-300 rounded-lg"
            onClick={handlePageClick}
          >
            {currentPage}
          </button>
        )}

        <button
          className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center active:bg-blue-700 text-lg font-bold"
          onClick={() => changePage(1)}
        >
          &#9650;
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="h-10 px-3 bg-neutral-200 text-neutral-700 rounded-lg active:bg-neutral-300 text-sm font-medium"
          onClick={handleSave}
        >
          저장
        </button>
        <button
          className="w-10 h-10 bg-neutral-800 text-white rounded-lg flex items-center justify-center active:bg-neutral-700 text-lg"
          onClick={onMenuOpen}
        >
          &#9776;
        </button>
      </div>
    </div>
  )
}
