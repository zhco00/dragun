import type { CellAddress } from "@/types/excel"

export function parseCellAddress(addr: string): CellAddress {
  const match = addr.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) {
    throw new Error(`Invalid cell address: ${addr}`)
  }

  const colStr = match[1]
  const row = parseInt(match[2], 10)

  let col = 0
  for (const c of colStr) {
    col = col * 26 + (c.charCodeAt(0) - 64)
  }

  return { row, col }
}

export function toCellAddress(row: number, col: number): string {
  let colStr = ""
  let c = col
  while (c > 0) {
    const rem = (c - 1) % 26
    colStr = String.fromCharCode(65 + rem) + colStr
    c = Math.floor((c - 1) / 26)
  }
  return `${colStr}${row}`
}

export function parseCellList(input: string): ReadonlyArray<CellAddress> {
  return input
    .replace(/\s/g, "")
    .split(",")
    .filter(Boolean)
    .map(parseCellAddress)
}
