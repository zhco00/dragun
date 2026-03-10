import ExcelJS from "exceljs"
import type { ExcelConfig } from "@/types/excel"
import type { Page } from "@/types/project"
import { getPhoto } from "@/lib/storage/indexed-db"
import { processImage } from "@/lib/image/resizer"

const MARGIN_RATIO = 0.03

function findMergeRange(
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number
): { startRow: number; endRow: number; startCol: number; endCol: number } {
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

  return { startRow: row, endRow: row, startCol: col, endCol: col }
}

function getColWidthPx(worksheet: ExcelJS.Worksheet, col: number): number {
  const colObj = worksheet.getColumn(col)
  return (colObj.width ?? 8.43) * 7.5 + 5
}

function getRowHeightPx(worksheet: ExcelJS.Worksheet, row: number): number {
  const rowObj = worksheet.getRow(row)
  return (rowObj.height ?? 15) * 1.333
}

function getCellRangeSizePx(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number
): { width: number; height: number } {
  let width = 0
  for (let c = startCol; c <= endCol; c++) {
    width += getColWidthPx(worksheet, c)
  }
  let height = 0
  for (let r = startRow; r <= endRow; r++) {
    height += getRowHeightPx(worksheet, r)
  }
  return { width, height }
}

function computeImagePlacement(
  worksheet: ExcelJS.Worksheet,
  merge: { startRow: number; endRow: number; startCol: number; endCol: number },
  imgWidth: number,
  imgHeight: number
): { tl: { col: number; row: number }; br: { col: number; row: number } } {
  const cellSize = getCellRangeSizePx(
    worksheet, merge.startRow, merge.endRow, merge.startCol, merge.endCol
  )

  const marginX = cellSize.width * MARGIN_RATIO
  const marginY = cellSize.height * MARGIN_RATIO
  const availW = cellSize.width - marginX * 2
  const availH = cellSize.height - marginY * 2

  if (availW <= 0 || availH <= 0) {
    return {
      tl: { col: merge.startCol - 1, row: merge.startRow - 1 },
      br: { col: merge.endCol, row: merge.endRow },
    }
  }

  const imgRatio = imgWidth / imgHeight
  const cellRatio = availW / availH

  let finalW: number
  let finalH: number
  if (imgRatio > cellRatio) {
    finalW = availW
    finalH = availW / imgRatio
  } else {
    finalH = availH
    finalW = availH * imgRatio
  }

  const padX = (cellSize.width - finalW) / 2
  const padY = (cellSize.height - finalH) / 2

  const tlColFrac = pxToColFraction(worksheet, merge.startCol, padX)
  const tlRowFrac = pxToRowFraction(worksheet, merge.startRow, padY)
  const brColFrac = pxToColFraction(worksheet, merge.startCol, padX + finalW)
  const brRowFrac = pxToRowFraction(worksheet, merge.startRow, padY + finalH)

  return {
    tl: { col: tlColFrac, row: tlRowFrac },
    br: { col: brColFrac, row: brRowFrac },
  }
}

function pxToColFraction(
  worksheet: ExcelJS.Worksheet,
  startCol: number,
  px: number
): number {
  let remaining = px
  let col = startCol

  while (remaining > 0) {
    const colW = getColWidthPx(worksheet, col)
    if (remaining < colW) {
      return (col - 1) + remaining / colW
    }
    remaining -= colW
    col++
  }

  return col - 1
}

function pxToRowFraction(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  px: number
): number {
  let remaining = px
  let row = startRow

  while (remaining > 0) {
    const rowH = getRowHeightPx(worksheet, row)
    if (remaining < rowH) {
      return (row - 1) + remaining / rowH
    }
    remaining -= rowH
    row++
  }

  return row - 1
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

          const merge = findMergeRange(worksheet, targetRow, targetCol)

          const processedBlob = await processImage(
            photoBlob,
            config.cropBottom
          )

          const imgBuffer = await processedBlob.arrayBuffer()
          const imageId = workbook.addImage({
            buffer: imgBuffer,
            extension: "jpeg",
          })

          const imgBitmap = await createImageBitmap(processedBlob)
          const placement = computeImagePlacement(
            worksheet,
            merge,
            imgBitmap.width,
            imgBitmap.height
          )
          imgBitmap.close()

          worksheet.addImage(imageId, {
            tl: placement.tl as ExcelJS.Anchor,
            br: placement.br as ExcelJS.Anchor,
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
