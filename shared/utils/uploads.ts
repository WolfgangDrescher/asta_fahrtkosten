// Gmail allows 25 MB per mail, base64 encoding adds about 33 %
export const MAX_TOTAL_SIZE_BYTES = 18 * 1024 * 1024

export const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
}

export const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPES)

export const getExtension = (filename: string) =>
  filename.slice(filename.lastIndexOf('.')).toLowerCase()

export const isAllowedFile = (filename: string) =>
  ALLOWED_EXTENSIONS.includes(getExtension(filename))
