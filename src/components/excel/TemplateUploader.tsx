"use client"

import { useCallback, useRef } from "react"
import { useExcelStore } from "@/stores/excel-store"

export function TemplateUploader() {
  const { templateName, setTemplate } = useExcelStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      await setTemplate(file, file.name)
    },
    [setTemplate]
  )

  return (
    <div className="bg-green-50 border border-green-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-green-700 mb-2">
        STEP 1. 양식 파일 선택
      </h3>
      <button
        className="w-full h-10 bg-white border border-neutral-300 rounded-lg text-sm active:bg-neutral-50"
        onClick={() => inputRef.current?.click()}
      >
        엑셀 파일 찾기
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        className="hidden"
        onChange={handleFileChange}
      />
      {templateName && (
        <p className="text-xs text-green-600 mt-2 truncate">{templateName}</p>
      )}
    </div>
  )
}
