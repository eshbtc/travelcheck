import type { PresenceDay } from '@/types/universal'

// Mock data for development and testing
export const mockPresenceDays: PresenceDay[] = [
  {
    date: '2024-01-15',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: ['passport_scan_001.jpg'],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-01-15T10:00:00-05:00'
  },
  {
    date: '2024-01-16',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: [],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-01-16T10:00:00-05:00'
  },
  {
    date: '2024-01-17',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: [],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-01-17T10:00:00-05:00'
  },
  {
    date: '2024-02-01',
    country: 'Canada',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: ['booking_confirmation_001.pdf'],
    conflicts: [],
    timezone: 'America/Toronto',
    localTime: '2024-02-01T14:00:00-05:00'
  },
  {
    date: '2024-02-02',
    country: 'Canada',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: [],
    conflicts: [],
    timezone: 'America/Toronto',
    localTime: '2024-02-02T14:00:00-05:00'
  },
  {
    date: '2024-02-03',
    country: 'Canada',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: [],
    conflicts: [],
    timezone: 'America/Toronto',
    localTime: '2024-02-03T14:00:00-05:00'
  },
  {
    date: '2024-03-10',
    country: 'Mexico',
    attribution: 'passport_stamp',
    confidence: 0.85,
    evidence: ['passport_scan_002.jpg'],
    conflicts: [],
    timezone: 'America/Mexico_City',
    localTime: '2024-03-10T12:00:00-06:00'
  },
  {
    date: '2024-03-11',
    country: 'Mexico',
    attribution: 'passport_stamp',
    confidence: 0.85,
    evidence: [],
    conflicts: [],
    timezone: 'America/Mexico_City',
    localTime: '2024-03-11T12:00:00-06:00'
  },
  {
    date: '2024-03-12',
    country: 'Mexico',
    attribution: 'passport_stamp',
    confidence: 0.85,
    evidence: [],
    conflicts: [],
    timezone: 'America/Mexico_City',
    localTime: '2024-03-12T12:00:00-06:00'
  },
  {
    date: '2024-04-05',
    country: 'United Kingdom',
    attribution: 'email_confirmation',
    confidence: 0.92,
    evidence: ['flight_confirmation_001.pdf'],
    conflicts: [],
    timezone: 'Europe/London',
    localTime: '2024-04-05T16:00:00+01:00'
  },
  {
    date: '2024-04-06',
    country: 'United Kingdom',
    attribution: 'email_confirmation',
    confidence: 0.92,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/London',
    localTime: '2024-04-06T16:00:00+01:00'
  },
  {
    date: '2024-04-07',
    country: 'United Kingdom',
    attribution: 'email_confirmation',
    confidence: 0.92,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/London',
    localTime: '2024-04-07T16:00:00+01:00'
  },
  {
    date: '2024-04-08',
    country: 'United Kingdom',
    attribution: 'email_confirmation',
    confidence: 0.92,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/London',
    localTime: '2024-04-08T16:00:00+01:00'
  },
  {
    date: '2024-04-09',
    country: 'United Kingdom',
    attribution: 'email_confirmation',
    confidence: 0.92,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/London',
    localTime: '2024-04-09T16:00:00+01:00'
  },
  {
    date: '2024-05-20',
    country: 'France',
    attribution: 'passport_stamp',
    confidence: 0.88,
    evidence: ['passport_scan_003.jpg'],
    conflicts: [],
    timezone: 'Europe/Paris',
    localTime: '2024-05-20T18:00:00+02:00'
  },
  {
    date: '2024-05-21',
    country: 'France',
    attribution: 'passport_stamp',
    confidence: 0.88,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Paris',
    localTime: '2024-05-21T18:00:00+02:00'
  },
  {
    date: '2024-05-22',
    country: 'France',
    attribution: 'passport_stamp',
    confidence: 0.88,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Paris',
    localTime: '2024-05-22T18:00:00+02:00'
  },
  {
    date: '2024-06-15',
    country: 'Germany',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: ['hotel_booking_001.pdf'],
    conflicts: [],
    timezone: 'Europe/Berlin',
    localTime: '2024-06-15T19:00:00+02:00'
  },
  {
    date: '2024-06-16',
    country: 'Germany',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Berlin',
    localTime: '2024-06-16T19:00:00+02:00'
  },
  {
    date: '2024-06-17',
    country: 'Germany',
    attribution: 'email_confirmation',
    confidence: 0.90,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Berlin',
    localTime: '2024-06-17T19:00:00+02:00'
  },
  {
    date: '2024-07-10',
    country: 'Italy',
    attribution: 'passport_stamp',
    confidence: 0.87,
    evidence: ['passport_scan_004.jpg'],
    conflicts: [],
    timezone: 'Europe/Rome',
    localTime: '2024-07-10T20:00:00+02:00'
  },
  {
    date: '2024-07-11',
    country: 'Italy',
    attribution: 'passport_stamp',
    confidence: 0.87,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Rome',
    localTime: '2024-07-11T20:00:00+02:00'
  },
  {
    date: '2024-07-12',
    country: 'Italy',
    attribution: 'passport_stamp',
    confidence: 0.87,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Rome',
    localTime: '2024-07-12T20:00:00+02:00'
  },
  {
    date: '2024-07-13',
    country: 'Italy',
    attribution: 'passport_stamp',
    confidence: 0.87,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Rome',
    localTime: '2024-07-13T20:00:00+02:00'
  },
  {
    date: '2024-08-05',
    country: 'Spain',
    attribution: 'email_confirmation',
    confidence: 0.89,
    evidence: ['flight_confirmation_002.pdf'],
    conflicts: [],
    timezone: 'Europe/Madrid',
    localTime: '2024-08-05T21:00:00+02:00'
  },
  {
    date: '2024-08-06',
    country: 'Spain',
    attribution: 'email_confirmation',
    confidence: 0.89,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Madrid',
    localTime: '2024-08-06T21:00:00+02:00'
  },
  {
    date: '2024-08-07',
    country: 'Spain',
    attribution: 'email_confirmation',
    confidence: 0.89,
    evidence: [],
    conflicts: [],
    timezone: 'Europe/Madrid',
    localTime: '2024-08-07T21:00:00+02:00'
  },
  {
    date: '2024-09-12',
    country: 'Japan',
    attribution: 'passport_stamp',
    confidence: 0.93,
    evidence: ['passport_scan_005.jpg'],
    conflicts: [],
    timezone: 'Asia/Tokyo',
    localTime: '2024-09-12T09:00:00+09:00'
  },
  {
    date: '2024-09-13',
    country: 'Japan',
    attribution: 'passport_stamp',
    confidence: 0.93,
    evidence: [],
    conflicts: [],
    timezone: 'Asia/Tokyo',
    localTime: '2024-09-13T09:00:00+09:00'
  },
  {
    date: '2024-09-14',
    country: 'Japan',
    attribution: 'passport_stamp',
    confidence: 0.93,
    evidence: [],
    conflicts: [],
    timezone: 'Asia/Tokyo',
    localTime: '2024-09-14T09:00:00+09:00'
  },
  {
    date: '2024-09-15',
    country: 'Japan',
    attribution: 'passport_stamp',
    confidence: 0.93,
    evidence: [],
    conflicts: [],
    timezone: 'Asia/Tokyo',
    localTime: '2024-09-15T09:00:00+09:00'
  },
  {
    date: '2024-09-16',
    country: 'Japan',
    attribution: 'passport_stamp',
    confidence: 0.93,
    evidence: [],
    conflicts: [],
    timezone: 'Asia/Tokyo',
    localTime: '2024-09-16T09:00:00+09:00'
  },
  {
    date: '2024-10-08',
    country: 'Australia',
    attribution: 'email_confirmation',
    confidence: 0.91,
    evidence: ['hotel_booking_002.pdf'],
    conflicts: [],
    timezone: 'Australia/Sydney',
    localTime: '2024-10-08T11:00:00+11:00'
  },
  {
    date: '2024-10-09',
    country: 'Australia',
    attribution: 'email_confirmation',
    confidence: 0.91,
    evidence: [],
    conflicts: [],
    timezone: 'Australia/Sydney',
    localTime: '2024-10-09T11:00:00+11:00'
  },
  {
    date: '2024-10-10',
    country: 'Australia',
    attribution: 'email_confirmation',
    confidence: 0.91,
    evidence: [],
    conflicts: [],
    timezone: 'Australia/Sydney',
    localTime: '2024-10-10T11:00:00+11:00'
  },
  {
    date: '2024-10-11',
    country: 'Australia',
    attribution: 'email_confirmation',
    confidence: 0.91,
    evidence: [],
    conflicts: [],
    timezone: 'Australia/Sydney',
    localTime: '2024-10-11T11:00:00+11:00'
  },
  {
    date: '2024-11-20',
    country: 'Brazil',
    attribution: 'passport_stamp',
    confidence: 0.86,
    evidence: ['passport_scan_006.jpg'],
    conflicts: [],
    timezone: 'America/Sao_Paulo',
    localTime: '2024-11-20T15:00:00-03:00'
  },
  {
    date: '2024-11-21',
    country: 'Brazil',
    attribution: 'passport_stamp',
    confidence: 0.86,
    evidence: [],
    conflicts: [],
    timezone: 'America/Sao_Paulo',
    localTime: '2024-11-21T15:00:00-03:00'
  },
  {
    date: '2024-11-22',
    country: 'Brazil',
    attribution: 'passport_stamp',
    confidence: 0.86,
    evidence: [],
    conflicts: [],
    timezone: 'America/Sao_Paulo',
    localTime: '2024-11-22T15:00:00-03:00'
  },
  {
    date: '2024-12-05',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: ['passport_scan_007.jpg'],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-12-05T10:00:00-05:00'
  },
  {
    date: '2024-12-06',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: [],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-12-06T10:00:00-05:00'
  },
  {
    date: '2024-12-07',
    country: 'United States',
    attribution: 'passport_stamp',
    confidence: 0.95,
    evidence: [],
    conflicts: [],
    timezone: 'America/New_York',
    localTime: '2024-12-07T10:00:00-05:00'
  }
]

// Mock service to provide data for development
export class MockDataService {
  static async getPresenceDays(): Promise<PresenceDay[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    return mockPresenceDays
  }

  static async generateMockReport() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    return {
      id: 'mock-report-001',
      generatedAt: new Date().toISOString(),
      data: {
        presenceCalendar: mockPresenceDays,
        summary: {
          totalDays: mockPresenceDays.length,
          countries: Array.from(new Set(mockPresenceDays.map(day => day.country))),
          dateRange: {
            start: '2024-01-15',
            end: '2024-12-07'
          }
        }
      }
    }
  }
}