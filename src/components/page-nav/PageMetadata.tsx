"use client"

import { useProjectStore } from "@/stores/project-store"
import type { PageMetadata as PageMetadataType } from "@/types/project"

interface PageMetadataProps {
  readonly onClose: () => void
}

export function PageMetadata({ onClose }: PageMetadataProps) {
  const { getCurrentMetadata, updateMetadata, undo, resetPage, slotMode, setSlotMode } =
    useProjectStore()

  const metadata = getCurrentMetadata()

  const handleChange = (field: keyof PageMetadataType, value: string) => {
    updateMetadata(field, value)
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-neutral-800">페이지 설정</h3>
        <button
          className="text-neutral-500 text-2xl leading-none"
          onClick={onClose}
        >
          &times;
        </button>
      </div>

      <div>
        <label className="text-sm text-neutral-500 mb-1 block">제목</label>
        <input
          type="text"
          className="w-full h-10 px-3 border border-neutral-300 rounded-lg text-sm"
          placeholder="예: 101동 203호"
          value={metadata.title}
          onChange={(e) => handleChange("title", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-neutral-500 mb-1 block">위치</label>
        <input
          type="text"
          className="w-full h-10 px-3 border border-neutral-300 rounded-lg text-sm"
          placeholder="예: 101동 305호"
          value={metadata.location}
          onChange={(e) => handleChange("location", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-neutral-500 mb-1 block">일자</label>
        <input
          type="text"
          className="w-full h-10 px-3 border border-neutral-300 rounded-lg text-sm"
          placeholder="예: 25.03.10"
          value={metadata.date}
          onChange={(e) => handleChange("date", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-blue-600 mb-1 block font-medium">
            왼쪽 내용 (1,2,3)
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 border border-neutral-300 rounded-lg text-sm"
            placeholder="도배 시공"
            value={metadata.leftContent}
            onChange={(e) => handleChange("leftContent", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-blue-600 mb-1 block font-medium">
            오른쪽 내용 (4,5,6)
          </label>
          <input
            type="text"
            className="w-full h-10 px-3 border border-neutral-300 rounded-lg text-sm"
            placeholder="타일 시공"
            value={metadata.rightContent}
            onChange={(e) => handleChange("rightContent", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1">
        <label className="text-sm text-neutral-600">슬롯 수:</label>
        <div className="flex gap-2">
          <button
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
              slotMode === 4
                ? "bg-blue-600 text-white"
                : "bg-neutral-200 text-neutral-700"
            }`}
            onClick={() => setSlotMode(4)}
          >
            4칸
          </button>
          <button
            className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
              slotMode === 6
                ? "bg-blue-600 text-white"
                : "bg-neutral-200 text-neutral-700"
            }`}
            onClick={() => setSlotMode(6)}
          >
            6칸
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          className="h-11 bg-neutral-200 text-neutral-700 rounded-lg font-medium active:bg-neutral-300"
          onClick={undo}
        >
          되돌리기
        </button>
        <button
          className="h-11 bg-red-600 text-white rounded-lg font-medium active:bg-red-700"
          onClick={() => {
            if (confirm("현재 페이지를 초기화할까요?")) {
              resetPage()
            }
          }}
        >
          페이지 리셋
        </button>
      </div>
    </div>
  )
}
