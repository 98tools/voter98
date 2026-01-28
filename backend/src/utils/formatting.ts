/**
 * Format a name to show only initials with masked characters
 * Example: "Alice Lopez" -> "A**** L****"
 * The number of stars is constant (4) regardless of actual name length
 */
export function formatNameWithInitials(name: string): string {
  if (!name || !name.trim()) return '';
  
  const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
  
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    // Single name: show initial + 4 stars
    return `${parts[0][0].toUpperCase()}****`;
  }
  
  // Multiple names: show initial of first and last + 4 stars each
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1][0].toUpperCase();
  return `${first}**** ${last}****`;
}
