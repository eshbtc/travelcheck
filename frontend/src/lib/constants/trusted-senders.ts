/**
 * Trusted Sender Lists for Flight Email Validation
 *
 * Whitelisted domains are known to send legitimate flight booking confirmations.
 * Blacklisted domains/patterns indicate marketing, newsletters, or spam.
 */

// Airline transactional domains (booking confirmations only)
export const AIRLINE_TRANSACTIONAL_DOMAINS = new Set([
  // US Airlines
  'confirmations.aa.com',
  'aa.com',
  'confirmation.aa.com',
  'united.com',
  'confirmation.united.com',
  'delta.com',
  'confirmation.delta.com',
  'southwest.com',
  'luv.southwest.com',
  'jetblue.com',
  'confirmation.jetblue.com',
  'alaskaair.com',
  'spirit.com',
  'flyfrontier.com',
  'allegiantair.com',
  'hawaiianairlines.com',

  // International Airlines
  'britishairways.com',
  'ba.com',
  'lufthansa.com',
  'airfrance.com',
  'klm.com',
  'emirates.com',
  'qatarairways.com',
  'etihad.com',
  'virginatlantic.com',
  'aircanada.com',
  'qantas.com',
  'singaporeair.com',
  'cathaypacific.com',
  'ana.co.jp',
  'jal.co.jp',
  'koreanair.com',

  // OTA Transactional Domains
  'expedia.com',
  'welcome.expedia.com',
  'itinerary.expedia.com',
  'booking.com',
  'confirmation.booking.com',
  'kayak.com',
  'priceline.com',
  'orbitz.com',
  'travelocity.com',
  'hotwire.com',
  'cheapoair.com',
  'skyscanner.com',
  'google.com', // Google Flights
  'flights.google.com',
])

// Marketing/newsletter domains and patterns to exclude
export const MARKETING_BLACKLIST_PATTERNS = [
  // Generic marketing prefixes
  'marketing.',
  'newsletter.',
  'promo.',
  'offers.',
  'deals.',
  'news.',
  'info@',
  'noreply@',
  'updates@',
  'promotions@',

  // Email service providers
  'mailchimp.com',
  'sendgrid.net',
  'constantcontact.com',
  'hubspot.com',
  'sparkpostmail.com',
  'amazonses.com',
  'mailgun.org',
  'postmarkapp.com',

  // Known marketing subdomains
  'e.delta.com',
  'e.united.com',
  't.delta.com',
  'marketing.united.com',
  'm.delta.com',
  'offers.aa.com',
  'deals.southwest.com',
  'promotions.jetblue.com',

  // Travel marketing sites
  'thepointsguy.com',
  'travelzoo.com',
  'secretflying.com',
  'scottscheapflights.com',
  'going.com',
]

// Subject line patterns that indicate booking confirmations
export const BOOKING_SUBJECT_PATTERNS = [
  /\bconfirmation\b/i,
  /\bconfirmed\b/i,
  /\bitinerary\b/i,
  /\be-?ticket\b/i,
  /\breceipt\b/i,
  /\bbooking\s+reference\b/i,
  /\bpnr\b/i,
  /\brecord\s+locator\b/i,
  /\btrip\s+details\b/i,
  /\bflight\s+confirmation\b/i,
  /\byour\s+trip\s+to\b/i,
  /\bboardingg?\s+pass\b/i,
]

// Subject line patterns that indicate marketing/newsletters
export const MARKETING_SUBJECT_PATTERNS = [
  /\bnewsletter\b/i,
  /\bsale\b/i,
  /\bflash\s+sale\b/i,
  /\boffer\b/i,
  /\b\d+%\s*off\b/i,
  /\bearn\s+points\b/i,
  /\bearn\s+miles\b/i,
  /\bexclusive\s+deal\b/i,
  /\bunsubscribe\b/i,
  /\bdeals?\s+to\b/i,
  /\blast\s+chance\b/i,
  /\blimited\s+time\b/i,
  /\bdon'?t\s+miss\b/i,
  /\bsave\s+\$\d+/i,
  /\bfree\s+upgrade\b/i,
  /\bstatus\s+match\b/i,
  /\bweekly\s+digest\b/i,
  /\bmonthly\s+update\b/i,
]

// Email body patterns that indicate marketing content
export const MARKETING_BODY_PATTERNS = [
  /unsubscribe/i,
  /click\s+here\s+to\s+view/i,
  /view\s+in\s+browser/i,
  /update\s+your\s+preferences/i,
  /manage\s+subscriptions/i,
  /you\s+received\s+this\s+email\s+because/i,
  /this\s+email\s+was\s+sent\s+to/i,
]

// Booking reference patterns (PNR/confirmation codes)
export const BOOKING_REFERENCE_PATTERNS = [
  /(?:confirmation|booking|pnr|record\s+locator)[\s:]+([A-Z0-9]{6})\b/i,
  /\b([A-Z]{6})\b/, // 6 uppercase letters (common for some airlines)
  /\b([A-Z0-9]{5,7})\b.*(?:confirmation|pnr)/i,
]

// Flight number patterns
export const FLIGHT_NUMBER_PATTERNS = [
  /\b([A-Z]{2})\s*(\d{1,4})\b/,
  /flight[\s#:]*([A-Z]{2}\s*\d{1,4})/i,
]
