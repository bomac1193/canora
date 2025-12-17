import { NextRequest, NextResponse } from 'next/server'
import { requireCreator } from '@/lib/rbac'
import { generateUploadUrl, getPublicUrl } from '@/lib/s3'

// POST /api/upload - Get presigned URL for audio upload
export async function POST(request: NextRequest) {
  const authResult = await requireCreator()
  if (!authResult.authorized) {
    return authResult.response
  }

  try {
    const body = await request.json()
    const { workId, contentType, fileSize } = body

    if (!workId) {
      return NextResponse.json(
        { error: 'Work ID is required' },
        { status: 400 }
      )
    }

    if (!contentType) {
      return NextResponse.json(
        { error: 'Content type is required' },
        { status: 400 }
      )
    }

    if (!fileSize || typeof fileSize !== 'number') {
      return NextResponse.json(
        { error: 'File size is required' },
        { status: 400 }
      )
    }

    const result = await generateUploadUrl(workId, contentType, fileSize)

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        uploadUrl: result.url,
        publicUrl: getPublicUrl(result.key),
        key: result.key,
      },
    })
  } catch (error) {
    console.error('Upload presign error:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
