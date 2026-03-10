"use client"

import { useEffect, useCallback, useState } from "react"
import { useExcelStore } from "@/stores/excel-store"
import { useProjectStore } from "@/stores/project-store"
import { TemplateUploader } from "@/components/excel/TemplateUploader"
import { CoordinateCalculator } from "@/components/excel/CoordinateCalculator"
import { PresetManager } from "@/components/excel/PresetManager"
import { generateExcel } from "@/lib/excel/template-processor"
import type { Page } from "@/types/project"
import { saveAs } from "file-saver"

export default function ExcelPage() {
  const excelStore = useExcelStore()
  const projectStore = useProjectStore()
  const [rowsInput, setRowsInput] = useState("34")
  const [titleInput, setTitleInput] = useState("B3")
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    excelStore.loadPresets()
    excelStore.loadTemplate()
    projectStore.loadSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    const { templateBlob, coordinates, cropBottom } = excelStore
    if (!templateBlob) {
      alert("엑셀 양식 파일을 선택해주세요")
      return
    }
    if (!coordinates) {
      alert("좌표를 먼저 생성해주세요")
      return
    }

    const rowsPerPage = parseInt(rowsInput, 10)
    if (isNaN(rowsPerPage) || rowsPerPage <= 0) {
      alert("페이지 행 수를 확인해주세요")
      return
    }

    setGenerating(true)
    try {
      const { slots, pageMetadata, slotMode } = projectStore
      const pageNums = new Set<number>()
      for (const key of Object.keys(slots)) {
        const pageNum = parseInt(key.split(":")[0], 10)
        pageNums.add(pageNum)
      }

      const pages: Page[] = Array.from(pageNums)
        .sort((a, b) => a - b)
        .map((pageNum) => {
          const pageSlots: (typeof slots[string] | null)[] = []
          for (let i = 1; i <= slotMode; i++) {
            pageSlots.push(slots[`${pageNum}:${i}`] ?? null)
          }
          const defaultDate = new Date()
            .toLocaleDateString("ko-KR", {
              year: "2-digit",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\. /g, ".")
            .replace(/\.$/, "")

          return {
            pageNum,
            slots: pageSlots,
            metadata: pageMetadata[pageNum] ?? {
              title: "",
              location: "",
              date: defaultDate,
              leftContent: "",
              rightContent: "",
            },
          }
        })

      if (pages.length === 0) {
        alert("배정된 사진이 없습니다")
        return
      }

      const blob = await generateExcel(
        templateBlob,
        {
          rowsPerPage,
          titleCell: titleInput,
          coordinates,
          cropBottom,
        },
        pages,
        (current, total) => setProgress({ current, total })
      )

      saveAs(blob, `사진대지_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (error) {
      console.error("Excel generation failed:", error)
      alert(`엑셀 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`)
    } finally {
      setGenerating(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [excelStore, projectStore, rowsInput, titleInput])

  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="flex items-center justify-between bg-white border-b border-neutral-200 px-4 py-3">
        <a
          href="/"
          className="text-blue-600 text-sm font-medium"
        >
          &larr; 돌아가기
        </a>
        <h1 className="text-base font-bold text-neutral-800">엑셀 설정</h1>
        <div className="w-16" />
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto pb-32">
        <TemplateUploader />
        <PresetManager />
        <CoordinateCalculator />

        <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-neutral-700">추가 설정</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                페이지 행 수
              </label>
              <input
                type="number"
                className="w-full h-8 px-2 text-sm border border-neutral-300 rounded bg-white"
                value={rowsInput}
                onChange={(e) => {
                  setRowsInput(e.target.value)
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v)) excelStore.setRowsPerPage(v)
                }}
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">
                제목 셀
              </label>
              <input
                type="text"
                className="w-full h-8 px-2 text-sm border border-neutral-300 rounded bg-white uppercase"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value)
                  excelStore.setTitleCell(e.target.value)
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="cropBottom"
              checked={excelStore.cropBottom}
              onChange={(e) => excelStore.setCropBottom(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="cropBottom" className="text-sm text-neutral-700">
              하단 날짜 자르기 (12%)
            </label>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-200">
        <div className="max-w-lg mx-auto">
          {generating && progress.total > 0 && (
            <div className="mb-2">
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600 transition-all"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-neutral-500 mt-1 text-center">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}
          <button
            className="w-full h-14 bg-green-600 text-white rounded-xl text-lg font-bold active:bg-green-700 disabled:opacity-50"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "생성 중..." : "사진대지 생성"}
          </button>
        </div>
      </div>
    </div>
  )
}
