"use client"

import { useState, useCallback } from "react"
import { useExcelStore } from "@/stores/excel-store"

export function PresetManager() {
  const { presets, loadPreset, savePreset, deletePreset } = useExcelStore()
  const [selectedPreset, setSelectedPreset] = useState("")
  const presetNames = Object.keys(presets)

  const handleSave = useCallback(async () => {
    const name = prompt("양식 이름:")
    if (!name) return
    await savePreset(name)
    setSelectedPreset(name)
  }, [savePreset])

  const handleLoad = useCallback(
    (name: string) => {
      setSelectedPreset(name)
      loadPreset(name)
    },
    [loadPreset]
  )

  const handleDelete = useCallback(async () => {
    if (!selectedPreset) return
    if (!confirm(`"${selectedPreset}" 프리셋을 삭제할까요?`)) return
    await deletePreset(selectedPreset)
    setSelectedPreset("")
  }, [selectedPreset, deletePreset])

  return (
    <div className="bg-neutral-50 border border-neutral-300 rounded-lg p-4">
      <h3 className="text-sm font-bold text-neutral-700 mb-2">프리셋</h3>

      {presetNames.length > 0 && (
        <select
          className="w-full h-9 px-2 border border-neutral-300 rounded-lg text-sm bg-white mb-2"
          value={selectedPreset}
          onChange={(e) => handleLoad(e.target.value)}
        >
          <option value="">선택...</option>
          {presetNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <button
          className="flex-1 h-9 bg-neutral-700 text-white rounded-lg text-sm font-medium active:bg-neutral-800"
          onClick={handleSave}
        >
          설정 저장
        </button>
        {selectedPreset && (
          <button
            className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium active:bg-red-700"
            onClick={handleDelete}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  )
}
