import React, { useState, useEffect } from 'react';
import { 
  analyzeEnhancedTravelHistory,
  generateUniversalReport,
  getAvailableCountries
} from '../services/firebaseFunctions';
import type { 
  AvailableCountriesResult 
} from '../types/firebase';
import { Button } from './ui/Button';
import Card from './ui/Card';

interface EnhancedTravelHistoryDashboardProps {
  onReportGenerated?: (reportId: string) => void;
}

interface TravelHistoryData {
  borderEvents: any[];
  tripSegments: any[];
  presenceCalendar: any[];
  presenceSummary: any;
  ruleEvaluations: any[];
}

export const EnhancedTravelHistoryDashboard: React.FC<EnhancedTravelHistoryDashboardProps> = ({ 
  onReportGenerated 
}) => {
  const [travelData, setTravelData] = useState<TravelHistoryData | null>(null);
  const [availableCountries, setAvailableCountries] = useState<AvailableCountriesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'presence' | 'rules' | 'reports'>('overview');

  useEffect(() => {
    loadTravelHistory();
    loadAvailableCountries();
  }, []);

  const loadTravelHistory = async () => {
    try {
      setLoading(true);
      const result = await analyzeEnhancedTravelHistory();
      if (result.success && result.data) {
        setTravelData(result.data);
      }
    } catch (error) {
      console.error('Error loading travel history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCountries = async () => {
    try {
      const result = await getAvailableCountries();
      if (result.success) {
        setAvailableCountries(result);
      }
    } catch (error) {
      console.error('Error loading available countries:', error);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      setGeneratingReport(true);
      const result = await generateUniversalReport(reportType);
      if (result.success && result.data) {
        if (onReportGenerated) {
          onReportGenerated(result.data.reportId);
        }
        // Show success message or redirect
        alert(`Report generated successfully! Report ID: ${result.data.reportId}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCountryFlag = (countryCode: string) => {
    // Simple flag emoji mapping
    const flags: Record<string, string> = {
      'US': '🇺🇸', 'GB': '🇬🇧', 'CA': '🇨🇦', 'AU': '🇦🇺',
      'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
      'NL': '🇳🇱', 'BE': '🇧🇪', 'AT': '🇦🇹', 'CH': '🇨🇭',
      'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮'
    };
    return flags[countryCode] || '🌍';
  };

  const getRuleStatusColor = (met: boolean) => {
    return met ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Travel History</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive travel analysis with presence calendar and rule evaluation
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadTravelHistory}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'presence', label: 'Presence Calendar' },
            { id: 'rules', label: 'Rule Evaluation' },
            { id: 'reports', label: 'Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && travelData && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {travelData.borderEvents.length}
              </div>
              <div className="text-sm text-gray-600">Border Events</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {travelData.tripSegments.length}
              </div>
              <div className="text-sm text-gray-600">Trip Segments</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {travelData.presenceCalendar.length}
              </div>
              <div className="text-sm text-gray-600">Presence Days</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {travelData.presenceSummary?.totalCountries || 0}
              </div>
              <div className="text-sm text-gray-600">Countries</div>
            </Card>
          </div>

          {/* Recent Border Events */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Border Events
            </h3>
            <div className="space-y-3">
              {travelData.borderEvents.slice(0, 10).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getCountryFlag(event.countryCode)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {event.countryCode} - {event.type}
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.location} • {formatDate(event.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.confidence ? `${event.confidence}%` : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Trip Segments */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Trip Segments
            </h3>
            <div className="space-y-3">
              {travelData.tripSegments.slice(0, 10).map((segment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <span className="text-lg">{getCountryFlag(segment.origin)}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-lg">{getCountryFlag(segment.destination)}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {segment.origin} to {segment.destination}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(segment.departureDate)} - {formatDate(segment.arrivalDate)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {segment.airline || 'Unknown'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Presence Calendar Tab */}
      {activeTab === 'presence' && travelData && (
        <div className="space-y-6">
          {/* Presence Summary */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Presence Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {travelData.presenceSummary?.totalCountries || 0}
                </div>
                <div className="text-sm text-blue-600">Countries</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {travelData.presenceSummary?.totalPresenceDays || 0}
                </div>
                <div className="text-sm text-green-600">Total Days</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {travelData.presenceSummary?.totalZones || 0}
                </div>
                <div className="text-sm text-purple-600">Zones</div>
              </div>
            </div>

            {/* Country Statistics */}
            {travelData.presenceSummary?.countryStats && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Country Statistics:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(travelData.presenceSummary.countryStats).map(([country, stats]: [string, any]) => (
                    <div key={country} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getCountryFlag(country)}</span>
                        <div className="text-sm font-medium text-gray-900">{country}</div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {stats.totalDays} days • {stats.confidence}% confidence
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(stats.firstEntry)} - {formatDate(stats.lastEntry)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Presence Calendar */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Presence Calendar
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {travelData.presenceCalendar.slice(0, 50).map((day, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getCountryFlag(day.countryCode || day.country)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {day.countryCode || day.country} {day.zone && `(${day.zone})`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(day.date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {day.confidence ? `${day.confidence}%` : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Rule Evaluation Tab */}
      {activeTab === 'rules' && travelData && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rule Evaluations
            </h3>
            <div className="space-y-4">
              {travelData.ruleEvaluations.map((rule, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {rule.ruleType} - {rule.country}
                      </h4>
                      <div className="text-xs text-gray-500">
                        Effective: {formatDate(rule.effectiveDate)}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRuleStatusColor(rule.met)}`}>
                      {rule.met ? 'MET' : 'NOT MET'}
                    </span>
                  </div>
                  
                  {rule.details && (
                    <div className="text-sm text-gray-600">
                      <div>Max Presence: {rule.details.maxPresence || 'N/A'}</div>
                      <div>Actual Presence: {rule.details.actualPresence || 'N/A'}</div>
                      {rule.details.windowDays && (
                        <div>Window: {rule.details.windowDays} days</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && availableCountries && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Generate Reports
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Report Type
              </label>
              <select
                value={selectedReportType}
                onChange={(e) => setSelectedReportType(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a report type...</option>
                {availableCountries.data.countries.map((country) => (
                  <optgroup key={country.code} label={country.name}>
                    {country.rules.map((rule) => (
                      <option key={rule} value={rule}>
                        {country.name} - {rule}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {availableCountries.data.zones.map((zone) => (
                  <optgroup key={zone.name} label={`${zone.name} Zone`}>
                    {zone.rules.map((rule) => (
                      <option key={rule} value={rule}>
                        {zone.name} - {rule}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => generateReport(selectedReportType)}
                disabled={!selectedReportType || generatingReport}
                variant="primary"
              >
                {generatingReport ? 'Generating...' : 'Generate Report'}
              </Button>
              <Button
                onClick={() => generateReport('universal_summary')}
                disabled={generatingReport}
                variant="outline"
              >
                Generate Universal Summary
              </Button>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Available Report Types
              </h4>
              <div className="text-sm text-blue-700">
                <div className="mb-2">
                  <strong>Country-specific reports:</strong> USCIS, UK ILR, Canada PR, etc.
                </div>
                <div className="mb-2">
                  <strong>Zone reports:</strong> Schengen 90/180, EU residence, etc.
                </div>
                <div>
                  <strong>Universal Summary:</strong> Comprehensive overview of all travel data
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
