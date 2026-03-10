import { create } from "zustand"
import type { CalcInputs, CoordinateSet, ExcelPreset } from "@/types/excel"
import { calculateCoordinates, coordinatesToStrings } from "@/lib/excel/coordinate-calc"
import { savePresets, getPresets, saveTemplate, getTemplate } from "@/lib/storage/indexed-db"

interface ExcelState {
  calcInputs: CalcInputs
  coordinates: CoordinateSet | null
  coordinateStrings: {
    images: string
    texts: string
    locations: string
    dates: string
  } | null
  rowsPerPage: number
  titleCell: string
  cropBottom: boolean
  presets: Record<string, ExcelPreset>
  templateBlob: Blob | null
  templateName: string
  isGenerating: boolean
  progress: { current: number; total: number }

  setCalcInput: (key: keyof CalcInputs, value: string) => void
  autoCalculate: () => void
  setRowsPerPage: (rows: number) => void
  setTitleCell: (cell: string) => void
  setCropBottom: (crop: boolean) => void
  setTemplate: (blob: Blob, name: string) => Promise<void>
  savePreset: (name: string) => Promise<void>
  loadPreset: (name: string) => void
  deletePreset: (name: string) => Promise<void>
  loadPresets: () => Promise<void>
  loadTemplate: () => Promise<void>
  setIsGenerating: (generating: boolean) => void
  setProgress: (current: number, total: number) => void
}

const DEFAULT_CALC_INPUTS: CalcInputs = {
  p1: "A6",
  p2: "N6",
  p3: "A16",
  t1: "A14",
  l1: "D13",
  d1: "K13",
}

export const useExcelStore = create<ExcelState>((set, get) => ({
  calcInputs: { ...DEFAULT_CALC_INPUTS },
  coordinates: null,
  coordinateStrings: null,
  rowsPerPage: 34,
  titleCell: "B3",
  cropBottom: true,
  presets: {},
  templateBlob: null,
  templateName: "",
  isGenerating: false,
  progress: { current: 0, total: 0 },

  setCalcInput: (key, value) => {
    set((state) => ({
      calcInputs: { ...state.calcInputs, [key]: value },
    }))
  },

  autoCalculate: () => {
    try {
      const { calcInputs } = get()
      const coords = calculateCoordinates(calcInputs)
      const strings = coordinatesToStrings(coords)
      set({ coordinates: coords, coordinateStrings: strings })
    } catch (error) {
      console.error("Coordinate calculation failed:", error)
      throw error
    }
  },

  setRowsPerPage: (rows) => set({ rowsPerPage: rows }),
  setTitleCell: (cell) => set({ titleCell: cell }),
  setCropBottom: (crop) => set({ cropBottom: crop }),

  setTemplate: async (blob, name) => {
    await saveTemplate(blob)
    set({ templateBlob: blob, templateName: name })
  },

  savePreset: async (name) => {
    const { calcInputs, rowsPerPage, titleCell, cropBottom, presets } = get()
    const preset: ExcelPreset = {
      name,
      calcInputs: { ...calcInputs },
      rowsPerPage,
      titleCell,
      cropBottom,
    }
    const newPresets = { ...presets, [name]: preset }
    await savePresets(newPresets)
    set({ presets: newPresets })
  },

  loadPreset: (name) => {
    const { presets } = get()
    const preset = presets[name]
    if (!preset) return

    set({
      calcInputs: { ...preset.calcInputs },
      rowsPerPage: preset.rowsPerPage,
      titleCell: preset.titleCell,
      cropBottom: preset.cropBottom,
    })

    get().autoCalculate()
  },

  deletePreset: async (name) => {
    const { presets } = get()
    const newPresets = { ...presets }
    delete newPresets[name]
    await savePresets(newPresets)
    set({ presets: newPresets })
  },

  loadPresets: async () => {
    const presets = await getPresets<Record<string, ExcelPreset>>()
    if (presets) set({ presets })
  },

  loadTemplate: async () => {
    const blob = await getTemplate()
    if (blob) set({ templateBlob: blob, templateName: "저장된 템플릿" })
  },

  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setProgress: (current, total) => set({ progress: { current, total } }),
}))
