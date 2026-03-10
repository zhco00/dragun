"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useProjectStore } from "@/stores/project-store"
import { PhotoViewer } from "@/components/photo-viewer/PhotoViewer"
import { SlotGrid } from "@/components/slots/SlotGrid"
import { PageNavigator } from "@/components/page-nav/PageNavigator"
import { PageMetadata } from "@/components/page-nav/PageMetadata"

export function MobileLayout() {
  const { addPhotos, isLoading, loadSession } = useProjectStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const handleImportPhotos = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      await addPhotos(files)
      e.target.value = ""
    },
    [addPhotos]
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-3 py-2 border-b border-neutral-200">
        <h1 className="text-base font-bold text-neutral-800">현장 사진대지</h1>
        <div className="flex gap-2">
          <button
            className="h-9 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium active:bg-blue-700"
            onClick={handleImportPhotos}
            disabled={isLoading}
          >
            {isLoading ? "불러오는 중..." : "사진 가져오기"}
          </button>
          <a
            href="/excel"
            className="h-9 px-3 bg-green-600 text-white rounded-lg text-sm font-medium flex items-center active:bg-green-700"
          >
            엑셀
          </a>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Photo Viewer */}
      <div className="flex-1 min-h-0">
        <PhotoViewer />
      </div>

      {/* Slot Grid */}
      <div className="bg-white border-t border-neutral-300">
        <SlotGrid />
      </div>

      {/* Page Navigator */}
      <PageNavigator onMenuOpen={() => setMenuOpen(true)} />

      {/* Bottom Sheet Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl max-h-[70dvh] overflow-y-auto animate-slide-up">
            <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mt-2 mb-1" />
            <PageMetadata onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
