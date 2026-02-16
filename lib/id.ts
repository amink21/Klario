/**
 * Generate a unique id (timestamp + random) to avoid duplicate key errors in lists.
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
