"use client"

import { useCallback } from "react"
import { useExcelStore } from "@/stores/excel-store"
import type { CalcInputs } from "@/types/excel"

const CALC_FIELDS: ReadonlyArray<{
  key: keyof CalcInputs
  label: string
}> = [
  { key: "p1", label: "1번 사진 (좌상단)" },
  { key: "p2", label: "2번 사진 (우상단)" },
  { key: "p3", label: "3번 사진 (좌중단)" },
  { key: "t1", label: "1번 내용" },
  { key: "l1", label: "1번 위치" },
  { key: "d1", label: "1번 일자" },
]

export function CoordinateCalculator() {
  const { calcInputs, coordinateStrings, setCalcInput, autoCalculate } =
    useExcelStore()

  const handleCalculate = useCallback(() => {
    try {
      autoCalculate()
    } catch {
      alert("입력값을 확인해주세요")
    }
  }, [autoCalculate])

  return (
    <div className="bg-blue-50 border border-blue-400 rounded-lg p-4">
      <h3 className="text-sm font-bold text-blue-700 mb-3">
        패턴 자동 계산기 (첫 칸만 입력)
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {CALC_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs text-neutral-600 block mb-0.5">
              {label}
            </label>
            <input
              type="text"
              className="w-full h-8 px-2 text-sm border border-neutral-300 rounded bg-white uppercase"
              value={calcInputs[key]}
              onChange={(e) => setCalcInput(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      <button
        className="w-full h-10 bg-blue-600 text-white rounded-lg text-sm font-bold active:bg-blue-700"
        onClick={handleCalculate}
      >
        좌표 18개 자동 생성
      </button>

      {coordinateStrings && (
        <div className="mt-3 space-y-1.5 text-xs">
          <div>
            <span className="text-neutral-500">사진:</span>{" "}
            <span className="text-neutral-800">{coordinateStrings.images}</span>
          </div>
          <div>
            <span className="text-neutral-500">내용:</span>{" "}
            <span className="text-neutral-800">{coordinateStrings.texts}</span>
          </div>
          <div>
            <span className="text-neutral-500">위치:</span>{" "}
            <span className="text-neutral-800">
              {coordinateStrings.locations}
            </span>
          </div>
          <div>
            <span className="text-neutral-500">일자:</span>{" "}
            <span className="text-neutral-800">{coordinateStrings.dates}</span>
          </div>
        </div>
      )}
    </div>
  )
}
