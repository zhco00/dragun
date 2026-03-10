export interface CellAddress {
  readonly row: number
  readonly col: number
}

export interface CoordinateSet {
  readonly images: ReadonlyArray<CellAddress>
  readonly texts: ReadonlyArray<CellAddress>
  readonly locations: ReadonlyArray<CellAddress>
  readonly dates: ReadonlyArray<CellAddress>
}

export interface CalcInputs {
  readonly p1: string
  readonly p2: string
  readonly p3: string
  readonly t1: string
  readonly l1: string
  readonly d1: string
}

export interface ExcelPreset {
  readonly name: string
  readonly calcInputs: CalcInputs
  readonly rowsPerPage: number
  readonly titleCell: string
  readonly cropBottom: boolean
}

export interface ExcelConfig {
  readonly rowsPerPage: number
  readonly titleCell: string
  readonly coordinates: CoordinateSet
  readonly cropBottom: boolean
}
