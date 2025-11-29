/**
 * Timezone utility module for frontend
 * Handles timezone-aware date conversions and displays
 */

/**
 * Get the configured timezone from environment or detect system timezone
 */
export function getTimezone(): string {
  // Try to get from environment variable first
  const envTimezone = import.meta.env.VITE_TIMEZONE;
  if (envTimezone) {
    return envTimezone;
  }
  
  // Fallback to system timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert timestamp to local datetime-local input format (YYYY-MM-DDTHH:mm)
 * This ensures the datetime-local input shows the correct local time
 * @param timestamp - Timestamp in milliseconds
 */
export function formatForDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp);
  // const timezone = getTimezone();
  
  // Get date parts in the local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Parse datetime-local input value to timestamp
 * The browser's datetime-local input already gives us local time
 * @param dateTimeLocalString - String from datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function parseDateTimeLocal(dateTimeLocalString: string): number {
  // Create date from local datetime string - browser handles local timezone
  const date = new Date(dateTimeLocalString);
  return date.getTime();
}

/**
 * Format timestamp for display with timezone
 * @param timestamp - Timestamp in milliseconds
 * @param options - Intl.DateTimeFormatOptions for formatting
 */
export function formatDateTime(
  timestamp: number,
  options?: Intl.DateTimeFormatOptions
): string {
  const timezone = getTimezone();
  const date = new Date(timestamp);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return date.toLocaleString('en-US', defaultOptions);
}

/**
 * Get a formatted timezone display string
 * Returns something like "America/New_York (EST)" or "UTC"
 */
export function getTimezoneDisplay(): string {
  const timezone = getTimezone();
  
  // Get the short timezone abbreviation
  const date = new Date();
  const shortTz = date.toLocaleTimeString('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  }).split(' ').pop();
  
  if (timezone === shortTz || !shortTz) {
    return timezone;
  }
  
  return `${timezone} (${shortTz})`;
}
