import { create } from "zustand"
import type { Photo, SlotAssignment, PageMetadata, ActionRecord } from "@/types/project"
import {
  savePhoto,
  saveThumbnail,
  deletePhoto,
  saveSession,
  getSession,
} from "@/lib/storage/indexed-db"
import { createThumbnail } from "@/lib/image/resizer"

interface SessionData {
  readonly currentPhotoIdx: number
  readonly currentPage: number
  readonly slotMode: 4 | 6
  readonly slots: Record<string, SlotAssignment>
  readonly pageMetadata: Record<number, PageMetadata>
}

interface ProjectState {
  photos: ReadonlyArray<Photo>
  currentPhotoIdx: number
  currentPage: number
  slotMode: 4 | 6
  slots: Record<string, SlotAssignment>
  pageMetadata: Record<number, PageMetadata>
  actionHistory: ReadonlyArray<ActionRecord>
  isLoading: boolean

  addPhotos: (files: FileList | File[]) => Promise<void>
  setCurrentPhotoIdx: (idx: number) => void
  movePhoto: (delta: number) => void
  setCurrentPage: (page: number) => void
  changePage: (delta: number) => void
  setSlotMode: (mode: 4 | 6) => void
  assignSlot: (slotNum: number) => void
  removeSlot: (slotNum: number) => void
  updateMetadata: (field: keyof PageMetadata, value: string) => void
  undo: () => void
  resetPage: () => void
  persistSession: () => Promise<void>
  loadSession: () => Promise<void>
  getPageSlots: (pageNum: number) => ReadonlyArray<SlotAssignment | null>
  getCurrentMetadata: () => PageMetadata
}

const DEFAULT_METADATA: PageMetadata = {
  title: "",
  location: "",
  date: new Date().toLocaleDateString("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, ""),
  leftContent: "",
  rightContent: "",
}

function slotKey(pageNum: number, slotNum: number): string {
  return `${pageNum}:${slotNum}`
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  photos: [],
  currentPhotoIdx: 0,
  currentPage: 1,
  slotMode: 6,
  slots: {},
  pageMetadata: {},
  actionHistory: [],
  isLoading: false,

  addPhotos: async (files) => {
    set({ isLoading: true })
    const newPhotos: Photo[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      await savePhoto(id, file)

      const thumb = await createThumbnail(file)
      await saveThumbnail(id, thumb)
      const thumbnailUrl = URL.createObjectURL(thumb)

      newPhotos.push({
        id,
        name: file.name,
        blob: file,
        thumbnailUrl,
        folderName: (file as File & { webkitRelativePath?: string })
          .webkitRelativePath
          ? (file as File & { webkitRelativePath?: string }).webkitRelativePath!.split("/")[0]
          : "photos",
      })
    }

    set((state) => ({
      photos: [...state.photos, ...newPhotos],
      isLoading: false,
    }))
  },

  setCurrentPhotoIdx: (idx) => {
    const { photos } = get()
    const clamped = Math.max(0, Math.min(idx, photos.length - 1))
    set({ currentPhotoIdx: clamped })
  },

  movePhoto: (delta) => {
    const { currentPhotoIdx, photos } = get()
    const newIdx = Math.max(0, Math.min(currentPhotoIdx + delta, photos.length - 1))
    set({ currentPhotoIdx: newIdx })
  },

  setCurrentPage: (page) => {
    set({ currentPage: Math.max(1, page) })
  },

  changePage: (delta) => {
    const { currentPage } = get()
    set({ currentPage: Math.max(1, currentPage + delta) })
  },

  setSlotMode: (mode) => set({ slotMode: mode }),

  assignSlot: (slotNum) => {
    const { photos, currentPhotoIdx, currentPage, slots } = get()
    if (photos.length === 0) return

    const photo = photos[currentPhotoIdx]
    const key = slotKey(currentPage, slotNum)
    const existing = slots[key]

    const record: ActionRecord = {
      type: "assign",
      pageNum: currentPage,
      slotNum,
      photoId: photo.id,
      previousPhotoId: existing?.photoId,
      previousPhotoIdx: currentPhotoIdx,
    }

    const newSlot: SlotAssignment = {
      pageNum: currentPage,
      slotNum,
      photoId: photo.id,
      thumbnailUrl: photo.thumbnailUrl,
    }

    set((state) => ({
      slots: { ...state.slots, [key]: newSlot },
      actionHistory: [...state.actionHistory, record],
      currentPhotoIdx: Math.min(currentPhotoIdx + 1, photos.length - 1),
    }))
  },

  removeSlot: (slotNum) => {
    const { currentPage, slots } = get()
    const key = slotKey(currentPage, slotNum)
    const existing = slots[key]
    if (!existing) return

    const record: ActionRecord = {
      type: "remove",
      pageNum: currentPage,
      slotNum,
      photoId: existing.photoId,
    }

    const newSlots = { ...slots }
    delete newSlots[key]

    set((state) => ({
      slots: newSlots,
      actionHistory: [...state.actionHistory, record],
    }))
  },

  updateMetadata: (field, value) => {
    const { currentPage, pageMetadata } = get()
    const current = pageMetadata[currentPage] ?? { ...DEFAULT_METADATA }
    set({
      pageMetadata: {
        ...pageMetadata,
        [currentPage]: { ...current, [field]: value },
      },
    })
  },

  undo: () => {
    const { actionHistory, slots } = get()
    if (actionHistory.length === 0) return

    const lastAction = actionHistory[actionHistory.length - 1]
    const newHistory = actionHistory.slice(0, -1)
    const key = slotKey(lastAction.pageNum, lastAction.slotNum)

    if (lastAction.type === "assign") {
      const newSlots = { ...slots }
      if (lastAction.previousPhotoId) {
        newSlots[key] = {
          ...newSlots[key],
          photoId: lastAction.previousPhotoId,
        }
      } else {
        delete newSlots[key]
      }
      set({
        slots: newSlots,
        actionHistory: newHistory,
        currentPage: lastAction.pageNum,
        currentPhotoIdx: lastAction.previousPhotoIdx ?? get().currentPhotoIdx,
      })
    } else {
      const photo = get().photos.find((p) => p.id === lastAction.photoId)
      if (photo) {
        set({
          slots: {
            ...slots,
            [key]: {
              pageNum: lastAction.pageNum,
              slotNum: lastAction.slotNum,
              photoId: lastAction.photoId,
              thumbnailUrl: photo.thumbnailUrl,
            },
          },
          actionHistory: newHistory,
          currentPage: lastAction.pageNum,
        })
      } else {
        set({ actionHistory: newHistory })
      }
    }
  },

  resetPage: () => {
    const { currentPage, slots, pageMetadata } = get()
    const newSlots = { ...slots }
    const slotMode = get().slotMode

    for (let i = 1; i <= slotMode; i++) {
      delete newSlots[slotKey(currentPage, i)]
    }

    const newMetadata = { ...pageMetadata }
    delete newMetadata[currentPage]

    set({
      slots: newSlots,
      pageMetadata: newMetadata,
    })
  },

  persistSession: async () => {
    const { currentPhotoIdx, currentPage, slotMode, slots, pageMetadata } = get()
    const data: SessionData = {
      currentPhotoIdx,
      currentPage,
      slotMode,
      slots,
      pageMetadata,
    }
    await saveSession(data)
  },

  loadSession: async () => {
    const data = await getSession<SessionData>()
    if (!data) return
    set({
      currentPhotoIdx: data.currentPhotoIdx,
      currentPage: data.currentPage,
      slotMode: data.slotMode ?? 6,
      slots: data.slots ?? {},
      pageMetadata: data.pageMetadata ?? {},
    })
  },

  getPageSlots: (pageNum) => {
    const { slots, slotMode } = get()
    const result: (SlotAssignment | null)[] = []
    for (let i = 1; i <= slotMode; i++) {
      result.push(slots[slotKey(pageNum, i)] ?? null)
    }
    return result
  },

  getCurrentMetadata: () => {
    const { currentPage, pageMetadata } = get()
    return pageMetadata[currentPage] ?? { ...DEFAULT_METADATA }
  },
}))
