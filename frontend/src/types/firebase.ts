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
