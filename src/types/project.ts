export interface Photo {
  readonly id: string
  readonly name: string
  readonly blob: Blob
  readonly thumbnailUrl: string
  readonly folderName: string
}

export interface SlotAssignment {
  readonly pageNum: number
  readonly slotNum: number
  readonly photoId: string
  readonly thumbnailUrl: string
}

export interface PageMetadata {
  readonly title: string
  readonly location: string
  readonly date: string
  readonly leftContent: string
  readonly rightContent: string
}

export interface Page {
  readonly pageNum: number
  readonly slots: ReadonlyArray<SlotAssignment | null>
  readonly metadata: PageMetadata
}

export interface ActionRecord {
  readonly type: "assign" | "remove"
  readonly pageNum: number
  readonly slotNum: number
  readonly photoId: string
  readonly previousPhotoId?: string
  readonly previousPhotoIdx?: number
}
