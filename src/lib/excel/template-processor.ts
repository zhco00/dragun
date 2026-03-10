import ExcelJS from "exceljs"
import type { ExcelConfig } from "@/types/excel"
import type { Page } from "@/types/project"
import { getPhoto } from "@/lib/storage/indexed-db"
import { toCellAddress } from "./cell-parser"

function findMergeRange(
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number
): { startRow: number; endRow: number; startCol: number; endCol: number } | null {
  for (const range of worksheet.model.merges ?? []) {
    const match = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (!match) continue

    const rStart = parseInt(match[2])
    const rEnd = parseInt(match[4])
    let cStart = 0
    for (const c of match[1]) cStart = cStart * 26 + (c.charCodeAt(0) - 64)
    let cEnd = 0
    for (const c of match[3]) cEnd = cEnd * 26 + (c.charCodeAt(0) - 64)

    if (row >= rStart && row <= rEnd && col >= cStart && col <= cEnd) {
      return { startRow: rStart, endRow: rEnd, startCol: cStart, endCol: cEnd }
    }
  }

  return null
}

function toImagePosition(
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number
): { tl: { col: number; row: number }; br: { col: number; row: number } } {
  const merge = findMergeRange(worksheet, row, col)

  if (merge) {
    return {
      tl: { col: merge.startCol - 1, row: merge.startRow - 1 },
      br: { col: merge.endCol, row: merge.endRow },
    }
  }

  return {
    tl: { col: col - 1, row: row - 1 },
    br: { col: col, row: row },
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function detectExtension(blob: Blob): "jpeg" | "png" {
  if (blob.type === "image/png") return "png"
  return "jpeg"
}

async function toJpegBase64(blob: Blob): Promise<{ base64: string; extension: "jpeg" | "png" }> {
  try {
    const bitmap = await createImageBitmap(blob)
    const maxSize = 1200
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close()
      throw new Error("Canvas context unavailable")
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const jpegBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 })
    const buffer = await jpegBlob.arrayBuffer()
    return { base64: arrayBufferToBase64(buffer), extension: "jpeg" }
  } catch {
    const buffer = await blob.arrayBuffer()
    return { base64: arrayBufferToBase64(buffer), extension: detectExtension(blob) }
  }
}

export async function generateExcel(
  templateBlob: Blob,
  config: ExcelConfig,
  pages: ReadonlyArray<Page>,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const buffer = await templateBlob.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.getWorksheet(1)
  if (!worksheet) {
    throw new Error("워크시트를 찾을 수 없습니다")
  }

  const totalSlots = pages.reduce(
    (sum, p) => sum + p.slots.filter(Boolean).length,
    0
  )
  let processed = 0

  for (const page of pages) {
    const pageOffset = (page.pageNum - 1) * config.rowsPerPage

    if (config.titleCell && page.metadata.title) {
      const titleAddr = config.titleCell.toUpperCase().match(/^([A-Z]+)(\d+)$/)
      if (titleAddr) {
        let titleCol = 0
        for (const c of titleAddr[1])
          titleCol = titleCol * 26 + (c.charCodeAt(0) - 64)
        const titleRow = parseInt(titleAddr[2])
        worksheet.getCell(titleRow + pageOffset, titleCol).value =
          page.metadata.title
      }
    }

    for (let slotIdx = 0; slotIdx < page.slots.length; slotIdx++) {
      const slot = page.slots[slotIdx]
      if (!slot) continue

      const photoBlob = await getPhoto(slot.photoId)
      if (!photoBlob) continue

      if (slotIdx < config.coordinates.images.length) {
        try {
          const imgCoord = config.coordinates.images[slotIdx]
          const targetRow = imgCoord.row + pageOffset
          const targetCol = imgCoord.col

          const { base64, extension } = await toJpegBase64(photoBlob)
          const imageId = workbook.addImage({
            base64,
            extension,
          })

          const pos = toImagePosition(worksheet, targetRow, targetCol)
          worksheet.addImage(imageId, {
            tl: pos.tl as ExcelJS.Anchor,
            br: pos.br as ExcelJS.Anchor,
            editAs: "oneCell",
          })
        } catch (error) {
          console.error(
            `이미지 삽입 실패 (페이지 ${page.pageNum}, 슬롯 ${slotIdx + 1}):`,
            error
          )
        }
      }

      if (slotIdx < config.coordinates.texts.length) {
        const txtCoord = config.coordinates.texts[slotIdx]
        const content =
          slotIdx < 3 ? page.metadata.leftContent : page.metadata.rightContent
        if (content) {
          worksheet.getCell(txtCoord.row + pageOffset, txtCoord.col).value =
            content
        }
      }

      if (slotIdx < config.coordinates.locations.length) {
        const locCoord = config.coordinates.locations[slotIdx]
        if (page.metadata.location) {
          worksheet.getCell(locCoord.row + pageOffset, locCoord.col).value =
            page.metadata.location
        }
      }

      if (slotIdx < config.coordinates.dates.length) {
        const dateCoord = config.coordinates.dates[slotIdx]
        if (page.metadata.date) {
          worksheet.getCell(dateCoord.row + pageOffset, dateCoord.col).value =
            page.metadata.date
        }
      }

      processed++
      onProgress?.(processed, totalSlots)
    }
  }

  const outputBuffer = await workbook.xlsx.writeBuffer()
  return new Blob([outputBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}
