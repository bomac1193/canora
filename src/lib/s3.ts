import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET!

// Allowed audio MIME types
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',      // .mp3
  'audio/wav',       // .wav
  'audio/x-wav',
  'audio/flac',      // .flac
  'audio/ogg',       // .ogg
  'audio/aac',       // .aac
  'audio/mp4',       // .m4a
]

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

/**
 * Generate a presigned URL for uploading audio
 */
export async function generateUploadUrl(
  workId: string,
  contentType: string,
  fileSize: number
): Promise<{ url: string; key: string } | { error: string }> {
  // Validate content type
  if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
    return { error: `Invalid file type. Allowed: ${ALLOWED_AUDIO_TYPES.join(', ')}` }
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    return { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` }
  }

  // Generate key with work ID for organization
  const ext = getExtensionFromMimeType(contentType)
  const key = `works/${workId}/audio${ext}`

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  })

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }) // 1 hour
    return { url, key }
  } catch (error) {
    console.error('S3 presign error:', error)
    return { error: 'Failed to generate upload URL' }
  }
}

/**
 * Get the public URL for an uploaded file
 */
export function getPublicUrl(key: string): string {
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/flac': '.flac',
    'audio/ogg': '.ogg',
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
  }
  return map[mimeType] || '.audio'
}
