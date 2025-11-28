/**
 * Storage API Client Utilities
 * Helper functions for interacting with the object storage API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL + '/api' || 'http://localhost:8787/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface UploadImageResponse {
  success: boolean;
  data: {
    fileName: string;
    originalName: string;
    size: number;
    contentType: string;
    url: string;
  };
}

export interface UploadFileResponse {
  success: boolean;
  data: {
    fileName: string;
    originalName: string;
    size: number;
    contentType: string;
    url: string;
  };
}

export interface ImageMetadata {
  key: string;
  size: number;
  uploaded: string;
  httpEtag: string;
  httpMetadata: {
    contentType: string;
  };
  customMetadata: {
    originalName: string;
    uploadedBy: string;
    uploadedAt: string;
    contentType: string;
    size: string;
  };
  url: string;
}

export interface ListImagesResponse {
  success: boolean;
  data: {
    files: Array<{
      key: string;
      size: number;
      uploaded: string;
      url: string;
      metadata: {
        originalName: string;
        uploadedBy: string;
        uploadedAt: string;
        contentType: string;
      };
    }>;
    truncated: boolean;
    cursor?: string;
  };
}

/**
 * Upload an image file to storage
 * @param file - The image file to upload
 * @returns Promise with upload response
 */
export const uploadImage = async (file: File, customFileName?: string): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', 'image');
  if (customFileName) {
    formData.append('customFileName', customFileName);
  }

  const response = await api.post('/storage/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Upload a file (any type) to storage
 * @param file - The file to upload
 * @param fileType - Type of file ('image', 'document', or 'any')
 * @param customFileName - Optional custom filename
 * @returns Promise with upload response
 */
export const uploadFile = async (
  file: File, 
  fileType: 'image' | 'document' | 'any' = 'any',
  customFileName?: string
): Promise<UploadFileResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileType', fileType);
  if (customFileName) {
    formData.append('customFileName', customFileName);
  }

  const response = await api.post('/storage/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Get the full URL for an image
 * @param fileName - The filename returned from upload
 * @returns Full URL to the image
 */
export const getImageUrl = (fileName: string): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  return `${baseUrl}/api/storage/images/${fileName}`;
};

/**
 * Get the full URL for a file
 * @param fileName - The filename returned from upload
 * @param forceDownload - Whether to force download instead of inline display
 * @returns Full URL to the file
 */
export const getFileUrl = (fileName: string, forceDownload: boolean = false): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  const downloadParam = forceDownload ? '?download=true' : '';
  return `${baseUrl}/api/storage/files/${fileName}${downloadParam}`;
};

/**
 * Delete an image from storage
 * @param fileName - The filename to delete
 * @returns Promise with delete response
 */
export const deleteImage = async (fileName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/storage/images/${fileName}`);
  return response.data;
};

/**
 * Delete a file from storage
 * @param fileName - The filename to delete
 * @returns Promise with delete response
 */
export const deleteFile = async (fileName: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/storage/files/${fileName}`);
  return response.data;
};

/**
 * Get metadata for an image
 * @param fileName - The filename to get metadata for
 * @returns Promise with image metadata
 */
export const getImageMetadata = async (fileName: string): Promise<ImageMetadata> => {
  const response = await api.get(`/storage/metadata/${fileName}`);
  return response.data.data;
};

/**
 * List all images (admin only)
 * @param limit - Maximum number of results to return
 * @param cursor - Pagination cursor from previous response
 * @returns Promise with list of images
 */
export const listImages = async (limit = 100, cursor?: string): Promise<ListImagesResponse> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.append('cursor', cursor);
  
  const response = await api.get(`/storage/list?${params.toString()}`);
  return response.data;
};

/**
 * Validate if a file is an acceptable image type
 * @param file - The file to validate
 * @returns true if valid, false otherwise
 */
export const isValidImageFile = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  return allowedTypes.includes(file.type);
};

/**
 * Validate if a file is an acceptable document type
 * @param file - The file to validate
 * @returns true if valid, false otherwise
 */
export const isValidDocumentFile = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/json',
    'text/markdown',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ];
  return allowedTypes.includes(file.type);
};

/**
 * Validate if a file is an acceptable file type (image or document)
 * @param file - The file to validate
 * @returns true if valid, false otherwise
 */
export const isValidFile = (file: File): boolean => {
  return isValidImageFile(file) || isValidDocumentFile(file);
};

/**
 * Validate if a file size is acceptable
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 10)
 * @returns true if valid, false otherwise
 */
export const isValidImageSize = (file: File, maxSizeMB = 10): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Validate if a file size is acceptable for any file type
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 20)
 * @returns true if valid, false otherwise
 */
export const isValidFileSize = (file: File, maxSizeMB = 20): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Validate both file type and size
 * @param file - The file to validate
 * @param maxSizeMB - Maximum size in megabytes (default: 10)
 * @returns Object with validation result and error message if invalid
 */
export const validateImageFile = (file: File, maxSizeMB = 10): { valid: boolean; error?: string } => {
  if (!isValidImageFile(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.',
    };
  }

  if (!isValidImageSize(file, maxSizeMB)) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
};

/**
 * Validate both file type and size for any file
 * @param file - The file to validate
 * @param fileType - Expected file type ('image', 'document', or 'any')
 * @param maxSizeMB - Maximum size in megabytes (default: 20)
 * @returns Object with validation result and error message if invalid
 */
export const validateFile = (
  file: File, 
  fileType: 'image' | 'document' | 'any' = 'any',
  maxSizeMB = 20
): { valid: boolean; error?: string } => {
  // Validate file type
  if (fileType === 'image' && !isValidImageFile(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.',
    };
  }

  if (fileType === 'document' && !isValidDocumentFile(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP, or other supported document.',
    };
  }

  if (fileType === 'any' && !isValidFile(file)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload an image or document file.',
    };
  }

  // Validate file size
  if (!isValidFileSize(file, maxSizeMB)) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSizeMB}MB.`,
    };
  }

  return { valid: true };
};

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
