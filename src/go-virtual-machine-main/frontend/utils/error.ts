/**
 * Extract printable string from JS Error
 * @param error Thrown Error
 * @returns Error message if exist else stringify error
 */
export function getErrorMessage(error: unknown) {
  console.log(error)
  if (error instanceof Error) return error.message
  return String(error)
}
