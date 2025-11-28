import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { uploadImage, getImageUrl, validateImageFile, formatFileSize } from '../../utils/storage';

const SITE_LOGO_FILENAME = 'logo.png';
const SITE_ICON_FILENAME = 'icon.png';

const BrandingTab: React.FC = () => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);

  useEffect(() => {
    // Check if custom logo/icon exists
    checkExistingBranding();
  }, []);

  const checkExistingBranding = async () => {
    try {
      // Try to load the existing logo
      const logoUrl = `${import.meta.env.VITE_API_BASE_URL}/api/storage/images/logo.png`;
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        setCurrentLogo(logoUrl);
      }

      // Try to load the existing icon
      const iconUrl = `${import.meta.env.VITE_API_BASE_URL}/api/storage/images/icon.png`;
      const iconResponse = await fetch(iconUrl);
      if (iconResponse.ok) {
        setCurrentIcon(iconUrl);
      }
    } catch (err) {
      // No existing branding, use defaults
      console.log('No custom branding found, using defaults');
    }
  };

  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setSuccess(null);

    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Validate file
    const validation = validateImageFile(file, 5); // 5MB max for logo
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleIconSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);
    setSuccess(null);

    if (!file) {
      setIconFile(null);
      setIconPreview(null);
      return;
    }

    // Validate file
    const validation = validateImageFile(file, 2); // 2MB max for icon
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setIconFile(null);
      setIconPreview(null);
      return;
    }

    setIconFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      setError('Please select a logo file first');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a new file with the standard name
      const standardLogoFile = new File([logoFile], SITE_LOGO_FILENAME, {
        type: logoFile.type,
      });

      await uploadImage(standardLogoFile, SITE_LOGO_FILENAME);
      const newLogoUrl = getImageUrl(SITE_LOGO_FILENAME);
      setCurrentLogo(newLogoUrl + '?t=' + Date.now()); // Add timestamp to bust cache
      setSuccess('Logo uploaded successfully! Refresh the page to see changes.');
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload logo';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadIcon = async () => {
    if (!iconFile) {
      setError('Please select an icon file first');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // Create a new file with the standard name
      const standardIconFile = new File([iconFile], SITE_ICON_FILENAME, {
        type: iconFile.type,
      });

      await uploadImage(standardIconFile, SITE_ICON_FILENAME);
      const newIconUrl = getImageUrl(SITE_ICON_FILENAME);
      setCurrentIcon(newIconUrl + '?t=' + Date.now()); // Add timestamp to bust cache
      setSuccess('Icon uploaded successfully! Refresh the page to see changes.');
      setIconFile(null);
      setIconPreview(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to upload icon';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Site Branding</h3>
        <p className="text-gray-600">
          Upload custom logo and icon for your site. These will be used throughout the application.
          If no custom branding is uploaded, default images will be used.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Site Logo</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Logo
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center" style={{ minHeight: '150px' }}>
              {currentLogo ? (
                <img
                  src={currentLogo}
                  alt="Current site logo"
                  className="max-h-32 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No custom logo uploaded</p>
                  <p className="text-xs mt-1">Using default logo</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Logo
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleLogoSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: PNG or SVG, max 5MB. Ideal size: 200x50px
            </p>
          </div>

          {logoFile && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Selected:</strong> {logoFile.name} ({formatFileSize(logoFile.size)})
              </p>
            </div>
          )}

          {logoPreview && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center" style={{ minHeight: '150px' }}>
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUploadLogo}
            disabled={!logoFile || uploading}
            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </button>
        </div>

        {/* Icon Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Site Icon (Favicon)</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Icon
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center" style={{ minHeight: '150px' }}>
              {currentIcon ? (
                <img
                  src={currentIcon}
                  alt="Current site icon"
                  className="max-h-24 max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <svg className="mx-auto h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <p className="text-sm">No custom icon uploaded</p>
                  <p className="text-xs mt-1">Using default icon</p>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Icon
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/x-icon"
              onChange={handleIconSelect}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended: PNG or ICO, max 2MB. Ideal size: 32x32px or 64x64px
            </p>
          </div>

          {iconFile && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Selected:</strong> {iconFile.name} ({formatFileSize(iconFile.size)})
              </p>
            </div>
          )}

          {iconPreview && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center justify-center" style={{ minHeight: '150px' }}>
                <img
                  src={iconPreview}
                  alt="Icon preview"
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUploadIcon}
            disabled={!iconFile || uploading}
            className="w-full py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Icon'}
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-blue-900 mb-2">📝 Usage Instructions</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Logo: Used in the navigation bar and other prominent locations</li>
          <li>• Icon: Used as the browser favicon (tab icon)</li>
          <li>• Files are stored with standard names: <code className="bg-blue-100 px-1 rounded">logo.png</code> and <code className="bg-blue-100 px-1 rounded">icon.png</code></li>
          <li>• You may need to refresh the page or <strong>clear cache</strong> to see changes</li>
          <li>• If you delete these files from storage, the site will revert to defaults</li>
        </ul>
      </div>
    </div>
  );
};

export default BrandingTab;
