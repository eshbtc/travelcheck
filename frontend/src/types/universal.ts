// Universal Travel & Residence Tracking Types

export interface UniversalResidenceRecord {
  id: string;
  userId: string;
  country: string;
  startDate: string;
  endDate?: string;
  duration: number; // days
  status: 'completed' | 'current' | 'interrupted';
  purpose: ResidencePurpose;
  source: DataSource;
  confidence: number;
  metadata: ResidenceMetadata;
  evidence: EvidenceSource[];
  conflicts?: ConflictRecord[];
}

export interface ResidencePurpose {
  type: 'work' | 'study' | 'tourism' | 'residence' | 'business' | 'family' | 'other';
  details?: string;
  visaType?: string;
  employer?: string;
  institution?: string;
}

export interface DataSource {
  type: 'passport_stamp' | 'flight_record' | 'email_itinerary' | 'manual_entry' | 'api_integration';
  processor: 'gemini_ai' | 'document_ai' | 'regex' | 'user_input';
  confidence: number;
  timestamp: string;
}

export interface EvidenceSource {
  id: string;
  type: 'image' | 'email' | 'document' | 'api_response';
  checksum: string;
  parsedFields: Record<string, any>;
  reliability: number;
  source: string;
}

export interface ConflictRecord {
  type: 'source_conflict' | 'date_conflict' | 'location_conflict';
  sources: string[];
  confidence: number;
  resolution?: 'user_override' | 'automatic' | 'pending';
  timestamp: string;
}

export interface ResidenceMetadata {
  visaType?: string;
  employer?: string;
  institution?: string;
  purpose?: string;
  notes?: string;
  tags?: string[];
}

// Country Rules and Requirements
export interface CountryRule {
  id: string;
  country: string;
  ruleType: RuleType;
  name: string;
  description: string;
  effectiveFrom: string;
  effectiveTo?: string;
  requirements: RuleRequirements;
  attributionPolicy: AttributionPolicy;
  exemptions?: Exemption[];
}

export interface RuleType {
  type: 'rolling_window' | 'cumulative' | 'absence_limit' | 'continuous_residence';
  parameters: Record<string, any>;
}

export interface RuleRequirements {
  requiredDays?: number;
  maxAbsence?: number;
  windowDays?: number;
  continuousResidence?: boolean;
  breaksAllowed?: number;
  calculationMethod: 'calendar_days' | 'midnight' | 'any_presence';
}

export interface AttributionPolicy {
  method: 'midnight' | 'any_presence' | 'jurisdiction_specific';
  timezone: string;
  rules: Record<string, any>;
}

export interface Exemption {
  type: 'student' | 'teacher' | 'government_employee' | 'medical' | 'family_emergency';
  conditions: Record<string, any>;
  weight?: number; // For weighted calculations
}

// Report Types
export interface UniversalReport {
  id: string;
  userId: string;
  reportType: ReportType;
  country: string;
  dateRange: DateRange;
  generatedAt: string;
  data: ReportData;
  metadata: ReportMetadata;
}

export interface ReportType {
  category: 'citizenship' | 'tax_residency' | 'visa_application' | 'travel_summary' | 'custom';
  subcategory?: string;
  purpose: string;
  requirements: string[];
}

export interface DateRange {
  start: string;
  end: string;
  timezone: string;
}

export interface ReportData {
  presenceCalendar: PresenceDay[];
  ruleEvaluations: RuleEvaluation[];
  summary: ReportSummary;
  evidence: EvidenceSource[];
  conflicts: ConflictRecord[];
}

export interface PresenceDay {
  date: string;
  country: string;
  attribution: string;
  confidence: number;
  evidence: string[];
  conflicts: ConflictRecord[];
  timezone: string;
  localTime: string;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  required: number;
  actual: number;
  met: boolean;
  details: Record<string, any>;
  attributionPolicy: string;
  effectiveDate: string;
}

export interface ReportSummary {
  totalCountries: number;
  totalPresenceDays: number;
  countryStats: Record<string, CountryStats>;
  dateRange: DateRange;
  dataQuality: DataQuality;
}

export interface CountryStats {
  country: string;
  totalDays: number;
  firstEntry: string;
  lastEntry: string;
  sources: string[];
  conflicts: number;
  purposes: string[];
}

export interface DataQuality {
  completeness: number; // 0-100
  confidence: number; // 0-100
  conflicts: number;
  gaps: number;
  recommendations: string[];
}

export interface ReportMetadata {
  version: string;
  generatedBy: string;
  dataSources: string[];
  rulesVersion: string;
  exportFormats: string[];
  customizations: Record<string, any>;
}

// User Preferences and Configuration
export interface UserProfile {
  id: string;
  primaryUseCase: UseCase;
  targetCountries: string[];
  timezone: string;
  preferences: UserPreferences;
  subscriptions: Subscription[];
}

export interface UseCase {
  category: 'immigration' | 'tax' | 'visa' | 'personal' | 'business' | 'legal';
  subcategory: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UserPreferences {
  defaultTimezone: string;
  dateFormat: string;
  numberFormat: string;
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  reportReady: boolean;
  dataConflicts: boolean;
  ruleUpdates: boolean;
}

export interface PrivacySettings {
  dataRetention: number; // days
  shareAnalytics: boolean;
  allowResearch: boolean;
  exportFormat: string[];
}

export interface Subscription {
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  features: string[];
  limits: Record<string, number>;
  expiresAt?: string;
}

// Export and Integration
export interface ExportRequest {
  reportId: string;
  format: 'pdf' | 'excel' | 'json' | 'csv';
  template?: string;
  customizations?: Record<string, any>;
  includeEvidence?: boolean;
  includeMetadata?: boolean;
  // Optional: provide full report data for on-the-fly export
  report?: any;
}

export interface ExportResult {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  metadata: Record<string, any>;
}

// Additional types to fix import errors

export interface BatchProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  results: any[];
  data?: {
    total?: number;
    processed?: number;
    cached?: number;
    duplicateCount?: number;
    errorCount?: number;
    scans?: any[];
    errors?: any[];
  };
}

export interface OptimizationResult {
  success: boolean;
  optimizations: any[];
  savings: number;
  data?: {
    batchSize?: number;
    estimatedCost?: number;
    suggestedBatchSize?: number;
    optimizations?: any[];
  };
}

export interface DuplicateDetectionResult {
  success: boolean;
  duplicates: DuplicateRecord[];
  total: number;
}

export interface DuplicateRecord {
  id: string;
  items: any[];
  confidence: number;
  type: string;
  status?: 'pending' | 'resolved' | 'dismissed' | 'pending_review';
  similarity?: number;
  detectedAt?: string;
  stamps?: any[];
  userId?: string;
  description?: string;
  timestamp?: string;
}

export interface SmartSuggestionsResult {
  success: boolean;
  suggestions: any[];
  data?: {
    suggestions?: any[];
    conflictingData?: any[];
    potentialGaps?: any[];
    recommendations?: any[];
    missingEntries?: any[];
  };
}

export interface TravelPatternsResult {
  success: boolean;
  patterns: any[];
  data?: {
    totalTrips?: number;
    totalCountries?: number;
    mostFrequentCountry?: string;
    longestStay?: { days: number; country: string };
    countriesVisited?: string[];
    travelFrequency?: Record<string, number>;
    frequentDestinations?: any[];
    travelTrends?: any[];
  };
}

export interface PotentialGap {
  id: string;
  start: string;
  end: string;
  confidence: number;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface ConflictData {
  id: string;
  type: string;
  items: any[];
  severity: 'low' | 'medium' | 'high';
  description?: string;
  country?: string;
  date?: string;
  confidence?: number;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action: string;
  type?: string;
}

export interface AvailableCountriesResult {
  success: boolean;
  data: Array<{
    code: string;
    name: string;
    rules: any[];
  }>;
  error?: string;
}

// Legacy Firebase types for compatibility
export interface PassportScan {
  id: string;
  user_id: string;
  created_at: string;
  file_url: string;
  analysis_results?: any;
  file_name?: string;
}

export interface FlightEmail {
  id: string;
  user_id: string;
  created_at: string;
  subject: string;
  from: string;
  body: string;
  parsed_data?: any;
}
