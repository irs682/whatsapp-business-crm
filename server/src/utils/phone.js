/**
 * Phone Number Normalization & E.164 Validation Utility
 */

/**
 * Normalizes phone numbers by stripping whitespace, dashes, parentheses, dots.
 * Preserves leading '+' if present. Converts leading '00' to '+'.
 * If no country code is present, preserves raw digits without inventing country codes.
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return '';

  let cleaned = rawPhone.trim();

  // Convert 00 prefix to +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  const hasLeadingPlus = cleaned.startsWith('+');

  // Strip all non-digit characters
  const digits = cleaned.replace(/\D/g, '');

  if (!digits) return '';

  if (hasLeadingPlus) {
    return `+${digits}`;
  }

  // If 10 digits and appears to be US/NANP or generic, keep digits
  return digits;
}

/**
 * Validates whether a phone number meets reasonable E.164 specifications
 * E.164: + followed by 7 to 15 digits
 */
function isValidE164(phone) {
  if (!phone) return false;
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

module.exports = {
  normalizePhoneNumber,
  isValidE164,
};
