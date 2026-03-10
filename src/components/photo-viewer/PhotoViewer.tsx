"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { useGesture } from "@use-gesture/react"
import { useProjectStore } from "@/stores/project-store"
import { getPhoto } from "@/lib/storage/indexed-db"

export function PhotoViewer() {
  const { photos, currentPhotoIdx, movePhoto } = useProjectStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })

  const currentPhoto = photos[currentPhotoIdx]

  useEffect(() => {
    if (!currentPhoto) {
      setImageUrl(null)
      return
    }

    let cancelled = false

    async function loadImage() {
      const blob = await getPhoto(currentPhoto.id)
      if (cancelled || !blob) return
      const url = URL.createObjectURL(blob)
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      setTransform({ x: 0, y: 0, scale: 1 })
    }

    loadImage()

    return () => {
      cancelled = true
    }
  }, [currentPhoto])

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], memo, first, last, swipe: [sx] }) => {
        if (last && transform.scale <= 1) {
          if (sx === -1) {
            movePhoto(1)
            return
          }
          if (sx === 1) {
            movePhoto(-1)
            return
          }
        }

        if (transform.scale > 1) {
          const start = first ? { x: transform.x, y: transform.y } : memo
          setTransform((t) => ({ ...t, x: start.x + mx, y: start.y + my }))
          return start
        }
        return memo
      },
      onPinch: ({ offset: [s] }) => {
        setTransform((t) => ({ ...t, scale: Math.max(0.5, Math.min(s, 5)) }))
      },
      onWheel: ({ delta: [, dy] }) => {
        setTransform((t) => ({
          ...t,
          scale: Math.max(0.5, Math.min(t.scale * (dy > 0 ? 0.95 : 1.05), 5)),
        }))
      },
    },
    {
      drag: { filterTaps: true, swipe: { velocity: 0.3, distance: 50 } },
      pinch: { scaleBounds: { min: 0.5, max: 5 } },
    }
  )

  const handleDoubleTap = useCallback(() => {
    setTransform((t) =>
      t.scale > 1 ? { x: 0, y: 0, scale: 1 } : { x: 0, y: 0, scale: 2.5 }
    )
  }, [])

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-neutral-900 text-neutral-400 select-none">
        <div className="text-center">
          <p className="text-lg mb-2">사진을 가져와주세요</p>
          <p className="text-sm">카메라 또는 갤러리에서 선택</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full bg-neutral-900 overflow-hidden touch-none select-none"
      {...bind()}
      onDoubleClick={handleDoubleTap}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={currentPhoto?.name ?? ""}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      )}

      <div className="absolute top-2 left-2 right-2 flex justify-between items-center pointer-events-none">
        <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
          {currentPhoto?.folderName} &gt; {currentPhoto?.name}
        </span>
        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded font-bold">
          {currentPhotoIdx + 1} / {photos.length}
        </span>
      </div>

      <button
        className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-12 rounded-r flex items-center justify-center active:bg-black/60"
        onClick={(e) => {
          e.stopPropagation()
          movePhoto(-1)
        }}
      >
        &lt;
      </button>
      <button
        className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-12 rounded-l flex items-center justify-center active:bg-black/60"
        onClick={(e) => {
          e.stopPropagation()
          movePhoto(1)
        }}
      >
        &gt;
      </button>
    </div>
  )
}
