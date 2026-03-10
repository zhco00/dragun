import ExcelJS from "exceljs"
import type { ExcelConfig } from "@/types/excel"
import type { Page } from "@/types/project"
import { getPhoto } from "@/lib/storage/indexed-db"
import { processImage } from "@/lib/image/resizer"

const CHAR_WIDTH_PX = 7.5
const ROW_HEIGHT_PX = 1.33
const MARGIN = 2

function getMergedCellSize(
  worksheet: ExcelJS.Worksheet,
  row: number,
  col: number
): { width: number; height: number } {
  let startRow = row
  let endRow = row
  let startCol = col
  let endCol = col

  for (const range of worksheet.model.merges ?? []) {
    const match = range.match(
      /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/
    )
    if (!match) continue

    const rStart = parseInt(match[2])
    const rEnd = parseInt(match[4])
    let cStart = 0
    for (const c of match[1]) cStart = cStart * 26 + (c.charCodeAt(0) - 64)
    let cEnd = 0
    for (const c of match[3]) cEnd = cEnd * 26 + (c.charCodeAt(0) - 64)

    if (row >= rStart && row <= rEnd && col >= cStart && col <= cEnd) {
      startRow = rStart
      endRow = rEnd
      startCol = cStart
      endCol = cEnd
      break
    }
  }

  let width = 0
  for (let c = startCol; c <= endCol; c++) {
    const colObj = worksheet.getColumn(c)
    width += (colObj.width ?? 8.43) * CHAR_WIDTH_PX
  }

  let height = 0
  for (let r = startRow; r <= endRow; r++) {
    const rowObj = worksheet.getRow(r)
    height += (rowObj.height ?? 15) * ROW_HEIGHT_PX
  }

  return { width, height }
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

          const cellSize = getMergedCellSize(worksheet, targetRow, targetCol)
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
          const imgRatio = imgBitmap.width / imgBitmap.height
          const cellWMargin = cellSize.width - MARGIN * 2
          const cellHMargin = cellSize.height - MARGIN * 2

          if (cellHMargin <= 0 || cellWMargin <= 0) {
            imgBitmap.close()
            continue
          }

          const cellRatio = cellWMargin / cellHMargin

          let finalWidth: number
          let finalHeight: number

          if (imgRatio > cellRatio) {
            finalWidth = cellWMargin
            finalHeight = cellWMargin / imgRatio
          } else {
            finalHeight = cellHMargin
            finalWidth = cellHMargin * imgRatio
          }

          const offsetX = (cellSize.width - finalWidth) / 2
          const offsetY = (cellSize.height - finalHeight) / 2

          worksheet.addImage(imageId, {
            tl: {
              col: targetCol - 1 + offsetX / (CHAR_WIDTH_PX * 8.43),
              row: targetRow - 1 + offsetY / (ROW_HEIGHT_PX * 15),
            },
            ext: { width: finalWidth, height: finalHeight },
          })
          imgBitmap.close()
        } catch (error) {
          console.error(`이미지 삽입 실패 (페이지 ${page.pageNum}, 슬롯 ${slotIdx + 1}):`, error)
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
