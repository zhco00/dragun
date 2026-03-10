export async function processImage(
  blob: Blob,
  cropBottom: boolean,
  maxSize = 1200
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap

  if (width === 0 || height === 0) {
    bitmap.close()
    throw new Error("Invalid image dimensions")
  }

  const scale = Math.min(1, maxSize / Math.max(width, height))
  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  const cropHeight = cropBottom
    ? Math.round(newHeight * 0.88)
    : newHeight

  const canvas = new OffscreenCanvas(newWidth, cropHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas context unavailable")
  }

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
  bitmap.close()

  const resultBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.9,
  })

  return resultBlob
}

export async function createThumbnail(
  blob: Blob,
  size = 200
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const { width, height } = bitmap

  if (width === 0 || height === 0) {
    bitmap.close()
    throw new Error("Invalid image dimensions")
  }

  const scale = Math.min(size / width, size / height)
  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas context unavailable")
  }

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight)
  bitmap.close()

  const resultBlob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality: 0.7,
  })

  return resultBlob
}
