import { Hono } from 'hono';
import { AppBindings, JWTPayload } from '../types';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

type Variables = {
  user?: JWTPayload;
};

const storage = new Hono<{ Bindings: AppBindings; Variables: Variables }>();

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Upload an image
 * POST /api/storage/upload
 */
storage.post('/upload', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const customFileName = formData.get('customFileName') as string | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return c.json({ 
        error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, SVG' 
      }, 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ 
        error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = customFileName ? customFileName : `${timestamp}-${randomString}.${fileExtension}`;

    // Get user info from JWT payload
    const user = c.get('user');
    const userId = user?.userId || 'anonymous';

    // Add metadata
    const metadata = {
      originalName: file.name,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      contentType: file.type,
      size: file.size.toString()
    };

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();
    await c.env.IMAGES_BUCKET.put(fileName, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: metadata
    });

    return c.json({
      success: true,
      data: {
        fileName,
        originalName: file.name,
        size: file.size,
        contentType: file.type,
        url: `/api/storage/images/${fileName}`
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get an image
 * GET /api/storage/images/:fileName
 */
storage.get('/images/:fileName', async (c) => {
  try {
    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json({ error: 'File name is required' }, 400);
    }

    const object = await c.env.IMAGES_BUCKET.get(fileName);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(object.body, {
      headers
    });

  } catch (error) {
    console.error('Get image error:', error);
    return c.json({ 
      error: 'Failed to retrieve file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Delete an image
 * DELETE /api/storage/images/:fileName
 */
storage.delete('/images/:fileName', authMiddleware, async (c) => {
  try {
    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json({ error: 'File name is required' }, 400);
    }

    // Get object metadata to check ownership
    const object = await c.env.IMAGES_BUCKET.get(fileName);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get user info from JWT
    const user = c.get('user');
    const userId = user?.userId;
    const isAdmin = user?.role === 'admin';

    // Check if user is admin or the uploader
    const uploadedBy = object.customMetadata?.uploadedBy;
    if (!isAdmin && uploadedBy !== userId) {
      return c.json({ error: 'Unauthorized to delete this file' }, 403);
    }

    // Delete from R2
    await c.env.IMAGES_BUCKET.delete(fileName);

    return c.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete image error:', error);
    return c.json({ 
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * List images (admin only)
 * GET /api/storage/list
 */
storage.get('/list', authMiddleware, adminMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const cursor = c.req.query('cursor');

    const listOptions: R2ListOptions = {
      limit,
      ...(cursor && { cursor })
    };

    const listed = await c.env.IMAGES_BUCKET.list(listOptions);

    const files = await Promise.all(
      listed.objects.map(async (obj) => {
        const metadata = obj.customMetadata || {};
        return {
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          url: `/api/storage/images/${obj.key}`,
          metadata: {
            originalName: metadata.originalName,
            uploadedBy: metadata.uploadedBy,
            uploadedAt: metadata.uploadedAt,
            contentType: metadata.contentType
          }
        };
      })
    );

    return c.json({
      success: true,
      data: {
        files,
        truncated: listed.truncated,
        ...(listed.truncated && listed.cursor && { cursor: listed.cursor })
      }
    });

  } catch (error) {
    console.error('List images error:', error);
    return c.json({ 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * Get image metadata
 * GET /api/storage/metadata/:fileName
 */
storage.get('/metadata/:fileName', authMiddleware, async (c) => {
  try {
    const fileName = c.req.param('fileName');

    if (!fileName) {
      return c.json({ error: 'File name is required' }, 400);
    }

    const object = await c.env.IMAGES_BUCKET.get(fileName);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        key: object.key,
        size: object.size,
        uploaded: object.uploaded,
        httpEtag: object.httpEtag,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
        url: `/api/storage/images/${fileName}`
      }
    });

  } catch (error) {
    console.error('Get metadata error:', error);
    return c.json({ 
      error: 'Failed to retrieve file metadata',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default storage;
