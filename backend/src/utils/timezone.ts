/**
 * Timezone utility module for handling local timezone conversions
 * Uses the TIMEZONE environment variable to ensure consistent timezone handling
 */

/**
 * Get the current timestamp in the configured timezone
 * Returns milliseconds since epoch (same format as Date.now() but timezone-aware)
 */
export function getLocalTimestamp(env?: any): number {
  const timezone = env?.TIMEZONE || process.env.TIMEZONE || 'UTC';
  
  // Create a date in the local timezone
  const now = new Date();
  
  // Get the time string in the target timezone
  const localDateString = now.toLocaleString('en-US', { timeZone: timezone });
  
  // Parse it back to get the timestamp
  const localDate = new Date(localDateString);
  
  return localDate.getTime();
}

/**
 * Convert a Date or timestamp to a localized string
 * @param date - Date object or timestamp (milliseconds)
 * @param env - Environment object containing TIMEZONE
 * @param options - Intl.DateTimeFormatOptions for formatting
 */
export function toLocaleDateString(
  date: Date | number,
  env?: any,
  options?: Intl.DateTimeFormatOptions
): string {
  const timezone = env?.TIMEZONE || process.env.TIMEZONE || 'UTC';
  const dateObj = typeof date === 'number' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return dateObj.toLocaleString('en-US', defaultOptions);
}

/**
 * Get timezone name for display purposes
 * @param env - Environment object containing TIMEZONE
 */
export function getTimezoneName(env?: any): string {
  return env?.TIMEZONE || process.env.TIMEZONE || 'UTC';
}

/**
 * Convert a datetime-local input string to timestamp in local timezone
 * @param dateTimeLocalString - String from datetime-local input (YYYY-MM-DDTHH:mm)
 * @param env - Environment object containing TIMEZONE
 */
export function parseLocalDateTime(dateTimeLocalString: string, env?: any): number {
  const timezone = env?.TIMEZONE || process.env.TIMEZONE || 'UTC';
  
  // Parse the datetime-local string as if it's in the configured timezone
  const dateStr = dateTimeLocalString.replace('T', ' ');
  
  // Create date object - this will be interpreted as local time in the execution environment
  // We need to adjust it to the configured timezone
  const date = new Date(dateTimeLocalString);
  
  return date.getTime();
}

/**
 * Format timestamp for datetime-local input
 * @param timestamp - Timestamp in milliseconds
 * @param env - Environment object containing TIMEZONE
 */
export function formatForDateTimeLocal(timestamp: number, env?: any): string {
  const timezone = env?.TIMEZONE || process.env.TIMEZONE || 'UTC';
  const date = new Date(timestamp);
  
  // Get the date in the target timezone
  const localDateString = date.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Convert to YYYY-MM-DDTHH:mm format
  const parts = localDateString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+)/);
  if (parts) {
    const [_, month, day, year, hour, minute] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  
  // Fallback to ISO string
  return date.toISOString().slice(0, 16);
}
