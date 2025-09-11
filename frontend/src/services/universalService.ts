import { callFunction } from './firebaseFunctions';
import { 
  UniversalResidenceRecord, 
  UniversalReport, 
  ReportType, 
  UserProfile, 
  ExportRequest,
  ExportResult 
} from '../types/universal';

export class UniversalTravelService {
  /**
   * Generate universal travel report for any purpose
   */
  async generateUniversalReport(
    reportType: ReportType,
    country: string,
    dateRange: { start: string; end: string },
    options: {
      includeEvidence?: boolean;
      includeConflicts?: boolean;
      userTimezone?: string;
      customRules?: any;
    } = {}
  ): Promise<UniversalReport> {
    try {
      const result = await callFunction('generateUniversalReport', {
        reportType,
        country,
        dateRange,
        ...options
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error generating universal report:', error);
      throw error;
    }
  }

  /**
   * Ingest hotel bookings from Gmail
   */
  async ingestGmailBookings(options: { maxResults?: number; query?: string } = {}): Promise<{ success: boolean; ingested: number; messageIds: string[] }>{
    const res = await callFunction('ingestGmailBookings', options);
    return res;
  }

  /**
   * Ingest hotel bookings from Office365/Outlook
   */
  async ingestOffice365Bookings(options: { maxResults?: number; providers?: string[]; days?: number } = {}): Promise<{ success: boolean; ingested: number; messageIds: string[] }>{
    const res = await callFunction('ingestOffice365Bookings', options);
    return res;
  }

  /**
   * Get booking ingestion status for current user
   */
  async getBookingIngestionStatus(): Promise<{
    lastIngestedAt: string | null;
    emailsIngested: number;
    totalParsedBookings: number;
    providers: Array<{ provider: string; emails: number; parsedBookings: number }>;
  }> {
    const res = await callFunction('getBookingIngestionStatus', {});
    return (res && res.data) || { lastIngestedAt: null, emailsIngested: 0, totalParsedBookings: 0, providers: [] };
  }

  /**
   * Get available countries and their rules
   */
  async getAvailableCountries(): Promise<Array<{
    code: string;
    name: string;
    rules: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
    }>;
  }>> {
    try {
      const result = await callFunction('getAvailableCountries');
      return result.data || [];
    } catch (error) {
      console.error('Error getting available countries:', error);
      return [];
    }
  }

  /**
   * Get country-specific rules
   */
  async getCountryRules(country: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    requirements: any;
    effectiveFrom: string;
    effectiveTo?: string;
  }>> {
    try {
      const result = await callFunction('getCountryRules', { country });
      return result.data || [];
    } catch (error) {
      console.error('Error getting country rules:', error);
      return [];
    }
  }

  /**
   * Analyze travel history for multiple purposes
   */
  async analyzeMultiPurpose(
    purposes: Array<{
      category: string;
      country: string;
      ruleId: string;
    }>,
    options: {
      userTimezone?: string;
      includeWhatIf?: boolean;
    } = {}
  ): Promise<Array<{
    purpose: string;
    country: string;
    ruleId: string;
    result: any;
    status: 'met' | 'not_met' | 'partial' | 'error';
  }>> {
    try {
      const result = await callFunction('analyzeMultiPurpose', {
        purposes,
        ...options
      });
      
      return result.data || [];
    } catch (error) {
      console.error('Error analyzing multi-purpose:', error);
      throw error;
    }
  }

  /**
   * Get user profile and preferences
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const result = await callFunction('getUserProfile');
      return result.data || null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update user profile and preferences
   */
  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const result = await callFunction('updateUserProfile', { profile });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Export report in various formats
   */
  async exportReport(request: ExportRequest | (ExportRequest & { report?: any })): Promise<ExportResult> {
    try {
      const result = await callFunction('exportReport', request);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export report');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }

  /**
   * Get report templates
   */
  async getReportTemplates(category?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    country: string;
    template: any;
    preview?: string;
  }>> {
    try {
      const result = await callFunction('getReportTemplates', { category });
      return result.data || [];
    } catch (error) {
      console.error('Error getting report templates:', error);
      return [];
    }
  }

  /**
   * Save custom report template
   */
  async saveReportTemplate(template: {
    name: string;
    description: string;
    category: string;
    country: string;
    template: any;
  }): Promise<string> {
    try {
      const result = await callFunction('saveReportTemplate', template);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save template');
      }
      
      return result.data.id;
    } catch (error) {
      console.error('Error saving report template:', error);
      throw error;
    }
  }

  /**
   * List reports for the current user
   */
  async listUniversalReports(limit: number = 500): Promise<UniversalReport[]> {
    try {
      const result = await callFunction('listUniversalReports', { limit });
      return (result && result.data) || [];
    } catch (error) {
      console.error('Error listing reports:', error);
      return [];
    }
  }

  /**
   * Delete a report by reportId (preferred)
   */
  async deleteUniversalReport(reportId: string): Promise<boolean> {
    try {
      const result = await callFunction('deleteUniversalReport', { reportId });
      return !!(result && result.success);
    } catch (error) {
      console.error('Error deleting report:', error);
      return false;
    }
  }

  /**
   * Get travel insights and recommendations
   */
  async getTravelInsights(options: {
    timeRange?: { start: string; end: string };
    countries?: string[];
    purposes?: string[];
  } = {}): Promise<{
    insights: Array<{
      type: 'opportunity' | 'warning' | 'info' | 'recommendation';
      title: string;
      description: string;
      action?: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    recommendations: Array<{
      category: string;
      title: string;
      description: string;
      impact: string;
      effort: 'low' | 'medium' | 'high';
    }>;
  }> {
    try {
      const result = await callFunction('getTravelInsights', options);
      return result.data || { insights: [], recommendations: [] };
    } catch (error) {
      console.error('Error getting travel insights:', error);
      return { insights: [], recommendations: [] };
    }
  }

  /**
   * Simulate "what-if" scenarios
   */
  async simulateScenario(scenario: {
    name: string;
    description: string;
    changes: Array<{
      type: 'add_travel' | 'remove_travel' | 'modify_travel';
      data: any;
    }>;
    purposes: Array<{
      category: string;
      country: string;
      ruleId: string;
    }>;
  }): Promise<{
    scenarioId: string;
    results: Array<{
      purpose: string;
      country: string;
      ruleId: string;
      before: any;
      after: any;
      impact: string;
    }>;
  }> {
    try {
      const result = await callFunction('simulateScenario', scenario);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to simulate scenario');
      }
      
      return result.data;
    } catch (error) {
      console.error('Error simulating scenario:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const universalTravelService = new UniversalTravelService();
