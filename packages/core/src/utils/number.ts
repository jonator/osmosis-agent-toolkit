/**
 * Adds precision to a number and returns as BigInt, handling large precisions safely
 * @param num The number to add precision to
 * @param precision The number of decimal places to add
 * @returns BigInt with the specified precision
 */
export function mulPrecision(num: number, precision: number): bigint {
  if (!Number.isFinite(num)) {
    throw new Error('Invalid number argument')
  }

  // Convert to regular decimal notation if in scientific notation
  const normalizedStr = num.toFixed(Math.max(precision, 20))

  // Handle sign.
  const negative = num < 0
  const absStr = Math.abs(Number(normalizedStr)).toString()

  // Split into integer and decimal parts.
  const [intPart, decPart = ''] = absStr.split('.')

  // "Floor" by cutting off any digits beyond the needed precision.
  const truncatedDec = decPart.slice(0, precision)

  // Pad with trailing zeros to reach the target precision.
  const paddedDec = truncatedDec.padEnd(precision, '0')

  // Combine.
  const combinedStr = intPart + paddedDec
  let result = combinedStr === '' ? 0n : BigInt(combinedStr)

  // Reapply negative if needed.
  if (negative) {
    result = -result
  }

  return result
}

/**
 * Limits a number to a maximum number of decimal places without rounding.
 * @example
 * ```
 * limitDecimals(123.456, 2)  // "123.45"
 * limitDecimals(0.1234, 3)   // "0.123"
 * limitDecimals(100, 2)      // "100"
 * limitDecimals(0.000123556, 6) // "0.000123"
 * limitDecimals(0.000123456, 0) // "0" (not "0.0001")
 * ```
 */
export function limitDecimals(num: number, maxDecimals = 6): string {
  return new Intl.NumberFormat('en-US', {
    roundingMode: 'floor',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false,
  }).format(num)
}

// describe('limitDecimals', () => {
//   test('should limit decimal places correctly without rounding', () => {
//     expect(limitDecimals(123.456, 2)).toBe('123.45')
//     expect(limitDecimals(0.1234, 3)).toBe('0.123')
//     expect(limitDecimals(100, 2)).toBe('100')
//     expect(limitDecimals(2317.567632731662, 6)).toBe('2317.567632')
//   })

//   test('should handle zero decimal places', () => {
//     expect(limitDecimals(123.456, 0)).toBe('123')
//     expect(limitDecimals(0.789, 0)).toBe('0')
//   })

//   test('should remove trailing zeros', () => {
//     expect(limitDecimals(123.4, 4)).toBe('123.4')
//     expect(limitDecimals(100.0, 4)).toBe('100')
//   })

//   test('should handle very small numbers', () => {
//     expect(limitDecimals(0.000123456, 6)).toBe('0.000123')
//     expect(limitDecimals(0.000123456, 9)).toBe('0.000123456')
//     expect(limitDecimals(0.8240679241742164, 6)).toBe('0.824067')
//   })

//   test('should handle very large numbers', () => {
//     expect(limitDecimals(123456789.123456, 2)).toBe('123456789.12')
//     expect(limitDecimals(999999999.999999, 4)).toBe('999999999.9999')
//   })
// })
