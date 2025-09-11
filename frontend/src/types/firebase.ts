// Type definitions for Firebase Functions responses

export interface FirebaseFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GmailConnectionStatus {
  connected: boolean;
  connectedAt?: string;
  email?: string;
}

export interface Office365ConnectionStatus {
  connected: boolean;
  connectedAt?: string;
  email?: string;
}

export interface EmailSyncResult {
  success: boolean;
  emails?: any[];
  processed?: number;
  usersChecked?: number;
}

export interface TravelHistoryResult {
  success: boolean;
  travelHistory?: any[];
}

export interface ReportResult {
  success: boolean;
  report?: any;
}

export interface UserProfile {
  full_name?: string;
  email?: string;
  email_notifications?: boolean;
  gmail_enabled?: boolean;
  office365_enabled?: boolean;
}

// ===== NEW FEATURES - Duplicate Detection & Caching =====

export interface DuplicateDetectionResult {
  success: boolean;
  data: {
    totalScans: number;
    duplicatesFound: number;
    duplicates: DuplicateRecord[];
  };
}

export interface DuplicateRecord {
  id: string;
  userId: string;
  type: 'stamp_duplicate' | 'image_duplicate';
  stamps?: any[];
  similarity: number;
  confidence: number;
  detectedAt: string;
  status: 'pending_review' | 'resolved';
  description: string;
  timestamp: string;
  resolution?: {
    action: 'keep_original' | 'keep_duplicate' | 'merge' | 'ignore';
    resolvedAt: string;
  };
}

export interface BatchProcessingResult {
  success: boolean;
  data: {
    total: number;
    processed: number;
    cached: number;
    duplicateCount: number;
    errorCount: number;
    scans: BatchScanResult[];
    duplicates: DuplicateRecord[];
    errors: BatchError[];
  };
}

export interface BatchScanResult {
  index: number;
  imageHash: string;
  fileName: string;
  cached: boolean;
  data: any;
}

export interface BatchError {
  index: number;
  imageHash: string;
  fileName: string;
  error: string;
}

export interface SmartSuggestionsResult {
  success: boolean;
  data: {
    missingEntries: any[];
    potentialGaps: PotentialGap[];
    conflictingData: ConflictData[];
    recommendations: Recommendation[];
  };
}

export interface PotentialGap {
  type: 'travel_gap';
  startDate: string;
  endDate: string;
  gapDays: number;
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface ConflictData {
  type: 'duplicate_entry';
  country: string;
  date: string;
  stamps: any[];
  description: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface Recommendation {
  type: 'upload_additional_documents' | 'review_conflicts';
  priority: 'low' | 'medium' | 'high';
  description: string;
  action: string;
}

export interface TravelPatternsResult {
  success: boolean;
  data: {
    totalTrips: number;
    countriesVisited: string[];
    totalCountries: number;
    travelFrequency: Record<string, number>;
    longestStay: any;
    mostFrequentCountry: string;
    travelTrends: any[];
  };
}

export interface OptimizationResult {
  success: boolean;
  data: {
    batchSize: number;
    estimatedCost: number;
    optimizations: Optimization[];
    suggestedBatchSize: number;
  };
}

export interface Optimization {
  type: 'batch_size' | 'cost_optimization';
  description: string;
  impact: 'performance' | 'cost';
}

export interface UniversalReportResult {
  success: boolean;
  data: {
    reportId: string;
    reportType: string;
    generatedAt: string;
    data: any;
  };
}

export interface AvailableCountriesResult {
  success: boolean;
  data: {
    countries: CountryInfo[];
    zones: ZoneInfo[];
  };
}

export interface CountryInfo {
  code: string;
  name: string;
  rules: string[];
}

export interface ZoneInfo {
  name: string;
  countries: string[];
  rules: string[];
}

export interface PassportScan {
  id: string;
  userId: string;
  imageUrl: string;
  imageData?: string;
  fileName?: string;
  timestamp?: any;
  stamps?: any[];
  cached?: boolean;
  source?: string;
  processor?: string;
  extractedData: {
    passportNumber: string;
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    expiryDate: string;
  };
  confidence: number;
  createdAt: string;
  status: 'pending' | 'processed' | 'failed';
}

export interface FlightEmail {
  id: string;
  userId: string;
  emailId: string;
  subject: string;
  sender: string;
  receivedAt: string;
  timestamp?: any;
  extractedData: {
    flightNumber: string;
    departure: {
      airport: string;
      city: string;
      date: string;
      time: string;
    };
    arrival: {
      airport: string;
      city: string;
      date: string;
      time: string;
    };
    airline: string;
    bookingReference: string;
    departureDate?: string;
    date?: string;
    destination?: string;
    country?: string;
  };
  confidence: number;
  processedAt: string;
  status: 'pending' | 'processed' | 'failed';
}
