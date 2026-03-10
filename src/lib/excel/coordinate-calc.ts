import type { CalcInputs, CoordinateSet, CellAddress } from "@/types/excel"
import { parseCellAddress, toCellAddress } from "./cell-parser"

export function calculateCoordinates(inputs: CalcInputs): CoordinateSet {
  const p1 = parseCellAddress(inputs.p1)
  const p2 = parseCellAddress(inputs.p2)
  const p3 = parseCellAddress(inputs.p3)
  const t1 = parseCellAddress(inputs.t1)
  const l1 = parseCellAddress(inputs.l1)
  const d1 = parseCellAddress(inputs.d1)

  const gapCol = p2.col - p1.col
  const gapRow = p3.row - p1.row

  const offTextRow = t1.row - p1.row
  const offTextCol = t1.col - p1.col
  const offLocRow = l1.row - p1.row
  const offLocCol = l1.col - p1.col
  const offDateRow = d1.row - p1.row
  const offDateCol = d1.col - p1.col

  const images: CellAddress[] = []
  const texts: CellAddress[] = []
  const locations: CellAddress[] = []
  const dates: CellAddress[] = []

  for (let i = 0; i < 6; i++) {
    const colFactor = Math.floor(i / 3)
    const rowFactor = i % 3

    const currRow = p1.row + rowFactor * gapRow
    const currCol = p1.col + colFactor * gapCol

    images.push(parseCellAddress(toCellAddress(currRow, currCol)))
    texts.push(
      parseCellAddress(
        toCellAddress(currRow + offTextRow, currCol + offTextCol)
      )
    )
    locations.push(
      parseCellAddress(toCellAddress(currRow + offLocRow, currCol + offLocCol))
    )
    dates.push(
      parseCellAddress(
        toCellAddress(currRow + offDateRow, currCol + offDateCol)
      )
    )
  }

  return { images, texts, locations, dates }
}

export function coordinatesToStrings(coords: CoordinateSet): {
  images: string
  texts: string
  locations: string
  dates: string
} {
  const toStr = (arr: ReadonlyArray<CellAddress>) =>
    arr.map((c) => toCellAddress(c.row, c.col)).join(", ")

  return {
    images: toStr(coords.images),
    texts: toStr(coords.texts),
    locations: toStr(coords.locations),
    dates: toStr(coords.dates),
  }
}
