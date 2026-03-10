import { get, set, del, keys, clear } from "idb-keyval"

const PHOTO_PREFIX = "photo:"
const THUMBNAIL_PREFIX = "thumb:"
const SESSION_KEY = "session"
const PRESET_KEY = "presets"
const TEMPLATE_KEY = "template"

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  await set(`${PHOTO_PREFIX}${id}`, blob)
}

export async function getPhoto(id: string): Promise<Blob | undefined> {
  return get<Blob>(`${PHOTO_PREFIX}${id}`)
}

export async function deletePhoto(id: string): Promise<void> {
  await del(`${PHOTO_PREFIX}${id}`)
  await del(`${THUMBNAIL_PREFIX}${id}`)
}

export async function saveThumbnail(id: string, blob: Blob): Promise<void> {
  await set(`${THUMBNAIL_PREFIX}${id}`, blob)
}

export async function getThumbnail(id: string): Promise<Blob | undefined> {
  return get<Blob>(`${THUMBNAIL_PREFIX}${id}`)
}

export async function saveSession(data: unknown): Promise<void> {
  await set(SESSION_KEY, data)
}

export async function getSession<T>(): Promise<T | undefined> {
  return get<T>(SESSION_KEY)
}

export async function savePresets(presets: unknown): Promise<void> {
  await set(PRESET_KEY, presets)
}

export async function getPresets<T>(): Promise<T | undefined> {
  return get<T>(PRESET_KEY)
}

export async function saveTemplate(blob: Blob): Promise<void> {
  await set(TEMPLATE_KEY, blob)
}

export async function getTemplate(): Promise<Blob | undefined> {
  return get<Blob>(TEMPLATE_KEY)
}

export async function getAllPhotoKeys(): Promise<string[]> {
  const allKeys = await keys()
  return allKeys
    .filter((k) => typeof k === "string" && k.startsWith(PHOTO_PREFIX))
    .map((k) => (k as string).replace(PHOTO_PREFIX, ""))
}

export async function clearAll(): Promise<void> {
  await clear()
}
