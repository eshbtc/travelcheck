import React, { useState, useEffect } from 'react';
import { 
  analyzeEnhancedTravelHistory,
  generateUniversalReport,
  getAvailableCountries
} from '@/services/supabaseService';
import type { 
  AvailableCountriesResult 
} from '@/types/universal';
import { Button } from './ui/Button';
import Card from './ui/Card';

interface EnhancedTravelHistoryDashboardProps {
  onReportGenerated?: (reportId: string) => void;
}

interface TravelHistoryData {
  patterns: Array<{
    type: string;
    description: string;
    frequency: string;
    countries: string[];
    recommendations: string[];
  }>;
  insights: Array<{
    type: 'opportunity' | 'warning' | 'info';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
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
        setTravelData(result.data as TravelHistoryData);
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
        const reportData = result.data as { id: string };
        if (onReportGenerated) {
          onReportGenerated(reportData.id);
        }
        // Show success message or redirect
        alert(`Report generated successfully! Report ID: ${reportData.id}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString || 'Unknown date'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-lg font-medium text-gray-900">Loading travel data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Travel History</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analysis of your travel patterns and residence history
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadTravelHistory}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </Button>
          <Button
            onClick={() => generateReport('travel_summary')}
            disabled={generatingReport}
            variant="primary"
          >
            {generatingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'presence', name: 'Travel Patterns' },
            { id: 'rules', name: 'Insights' },
            { id: 'reports', name: 'Reports' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
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
                {travelData.patterns.length}
              </div>
              <div className="text-sm text-gray-600">Travel Patterns</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {travelData.insights.length}
              </div>
              <div className="text-sm text-gray-600">Insights</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {travelData.insights.filter(i => i.type === 'opportunity').length}
              </div>
              <div className="text-sm text-gray-600">Opportunities</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {travelData.insights.filter(i => i.type === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Countries</div>
            </Card>
          </div>

          {/* Travel Patterns */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Travel Patterns
            </h3>
            <div className="space-y-3">
              {travelData.patterns.slice(0, 10).map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {pattern.type}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {pattern.description}
                      </div>
                      <div className="text-xs text-gray-400">
                        Frequency: {pattern.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Countries: {pattern.countries.slice(0, 3).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Travel Insights */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Travel Insights
            </h3>
            <div className="space-y-3">
              {travelData.insights.slice(0, 10).map((insight, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      insight.type === 'warning' ? 'bg-red-100 text-red-800' :
                      insight.type === 'opportunity' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {insight.type.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {insight.description}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${
                    insight.priority === 'high' ? 'text-red-600' :
                    insight.priority === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {insight.priority} priority
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Presence Tab */}
      {activeTab === 'presence' && travelData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {travelData.insights.filter(i => i.type === 'warning').length}
              </div>
              <div className="text-sm text-blue-600">Countries</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {travelData.patterns.length}
              </div>
              <div className="text-sm text-green-600">Total Days</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {travelData.insights.length}
              </div>
              <div className="text-sm text-purple-600">Zones</div>
            </div>
          </div>

          {/* Country Statistics */}
          {travelData.patterns?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Country Statistics:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {travelData.patterns.map((pattern, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-sm font-medium text-gray-900">{pattern.type}</div>
                    </div>
                    <div className="text-xs text-gray-600">
                      {pattern.countries.length} days • {100}% confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      Countries: {pattern.countries.slice(0, 2).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel Pattern Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Travel Pattern Details
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {travelData.patterns.slice(0, 10).map((pattern, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {pattern.type}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {pattern.description}
                    </div>
                    <div className="text-xs text-gray-500">
                      Frequency: {pattern.frequency} • Countries: {pattern.countries.join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'rules' && travelData && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Travel Insights</h3>
          <div className="space-y-4">
            {travelData.insights.slice(0, 20).map((insight, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </h4>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        insight.type === 'warning' ? 'bg-red-100 text-red-800' :
                        insight.type === 'opportunity' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {insight.type.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                      <div className="text-sm text-gray-700">
                        {insight.description}
                      </div>
                      <div className="text-sm text-gray-700">
                        Priority: {insight.priority}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && availableCountries && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Generate Reports</h3>
            <Button
              onClick={() => generateReport(selectedReportType)}
              disabled={!selectedReportType || generatingReport}
              variant="primary"
            >
              {generatingReport ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Available Countries */}
            <Card className="p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Available Countries</h4>
              <div className="space-y-3">
                {availableCountries.data?.map((country, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="text-sm font-medium text-gray-900">{country.name} ({country.code})</div>
                    </div>
                    {country.rules.map((rule: any, ruleIndex: number) => (
                      <div key={ruleIndex} className="text-xs text-gray-600 ml-2">
                        • {rule.description || 'Standard immigration rule'}
                      </div>
                    ))}
                  </div>
                )) || []}
              </div>
            </Card>

            {/* Report Types */}
            <Card className="p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Report Types</h4>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 mb-2">Travel Summary</div>
                  <div className="text-xs text-gray-600">
                    • Complete travel history overview
                  </div>
                </div>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 mb-2">Citizenship Requirements</div>
                  <div className="text-xs text-gray-600">
                    • Country-specific residency analysis
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Report Selection */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Report Type:
            </label>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a report type...</option>
              <option value="us_naturalization">US Naturalization (5-year rule)</option>
              <option value="uk_settlement">UK Settlement (5-year rule)</option>
              <option value="eu_long_term">EU Long-term Resident</option>
              <option value="schengen_90_180">Schengen 90/180 Rule</option>
              <option value="travel_summary">Complete Travel Summary</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};