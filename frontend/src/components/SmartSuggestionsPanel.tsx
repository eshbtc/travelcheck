import React, { useState, useEffect } from 'react';
import { 
  generateSmartSuggestions, 
  analyzeTravelPatterns 
} from '../services/firebaseFunctions';
import type { 
  SmartSuggestionsResult, 
  TravelPatternsResult,
  PotentialGap,
  ConflictData,
  Recommendation
} from '../types/firebase';
import { Button } from './ui/Button';
import Card from './ui/Card';

interface SmartSuggestionsPanelProps {
  onSuggestionAction?: (action: string, data: any) => void;
}

export const SmartSuggestionsPanel: React.FC<SmartSuggestionsPanelProps> = ({ 
  onSuggestionAction 
}) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestionsResult | null>(null);
  const [travelPatterns, setTravelPatterns] = useState<TravelPatternsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'patterns'>('suggestions');

  useEffect(() => {
    loadSmartSuggestions();
    loadTravelPatterns();
  }, []);

  const loadSmartSuggestions = async () => {
    try {
      setLoading(true);
      const result = await generateSmartSuggestions();
      if (result.success) {
        setSuggestions(result);
      }
    } catch (error) {
      console.error('Error loading smart suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTravelPatterns = async () => {
    try {
      const result = await analyzeTravelPatterns();
      if (result.success) {
        setTravelPatterns(result);
      }
    } catch (error) {
      console.error('Error loading travel patterns:', error);
    }
  };

  const handleSuggestionAction = (action: string, data: any) => {
    if (onSuggestionAction) {
      onSuggestionAction(action, data);
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString(),
      days: diffDays
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Suggestions & Insights</h2>
          <p className="text-gray-600 mt-1">
            AI-powered recommendations and travel pattern analysis
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadSmartSuggestions}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Refresh Suggestions'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'suggestions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Smart Suggestions
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'patterns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Travel Patterns
          </button>
        </nav>
      </div>

      {/* Smart Suggestions Tab */}
      {activeTab === 'suggestions' && suggestions && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {suggestions.data.potentialGaps.length}
              </div>
              <div className="text-sm text-gray-600">Potential Gaps</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {suggestions.data.conflictingData.length}
              </div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {suggestions.data.recommendations.length}
              </div>
              <div className="text-sm text-gray-600">Recommendations</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {suggestions.data.missingEntries.length}
              </div>
              <div className="text-sm text-gray-600">Missing Entries</div>
            </Card>
          </div>

          {/* Potential Gaps */}
          {suggestions.data.potentialGaps.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Potential Travel Gaps
              </h3>
              <div className="space-y-4">
                {suggestions.data.potentialGaps.map((gap: PotentialGap, index) => {
                  const dateRange = formatDateRange(gap.startDate, gap.endDate);
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">{getConfidenceIcon(gap.confidence)}</span>
                            <h4 className="text-sm font-medium text-gray-900">
                              {gap.description}
                            </h4>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {dateRange.start} to {dateRange.end} ({dateRange.days} days)
                          </div>
                          <div className="text-xs text-gray-500">
                            Confidence: {gap.confidence}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleSuggestionAction('upload_documents', gap)}
                            variant="outline"
                            size="sm"
                          >
                            Upload Documents
                          </Button>
                          <Button
                            onClick={() => handleSuggestionAction('ignore_gap', gap)}
                            variant="outline"
                            size="sm"
                          >
                            Ignore
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Conflicting Data */}
          {suggestions.data.conflictingData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Data Conflicts
              </h3>
              <div className="space-y-4">
                {suggestions.data.conflictingData.map((conflict: ConflictData, index) => (
                  <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-lg">⚠️</span>
                          <h4 className="text-sm font-medium text-red-900">
                            {conflict.description}
                          </h4>
                        </div>
                        <div className="text-sm text-red-700 mb-2">
                          {conflict.country} - {conflict.date}
                        </div>
                        <div className="text-xs text-red-600">
                          Confidence: {conflict.confidence}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleSuggestionAction('review_conflict', conflict)}
                          variant="outline"
                          size="sm"
                        >
                          Review
                        </Button>
                        <Button
                          onClick={() => handleSuggestionAction('resolve_conflict', conflict)}
                          variant="outline"
                          size="sm"
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {suggestions.data.recommendations.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recommendations
              </h3>
              <div className="space-y-4">
                {suggestions.data.recommendations.map((rec: Recommendation, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <h4 className="text-sm font-medium text-gray-900">
                            {rec.type === 'upload_additional_documents' ? 'Upload Documents' : 'Review Conflicts'}
                          </h4>
                        </div>
                        <div className="text-sm text-gray-600">
                          {rec.description}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSuggestionAction(rec.action, rec)}
                        variant="primary"
                        size="sm"
                      >
                        {rec.action === 'upload_documents' ? 'Upload' : 'Review'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No Issues */}
          {suggestions.data.potentialGaps.length === 0 && 
           suggestions.data.conflictingData.length === 0 && 
           suggestions.data.recommendations.length === 0 && (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Issues Found
              </h3>
              <p className="text-gray-600">
                Your travel data looks good! No gaps, conflicts, or recommendations at this time.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Travel Patterns Tab */}
      {activeTab === 'patterns' && travelPatterns && (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {travelPatterns.data.totalTrips}
              </div>
              <div className="text-sm text-gray-600">Total Trips</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {travelPatterns.data.totalCountries}
              </div>
              <div className="text-sm text-gray-600">Countries Visited</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {travelPatterns.data.mostFrequentCountry || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Most Frequent</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {travelPatterns.data.longestStay ? `${travelPatterns.data.longestStay.days} days` : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Longest Stay</div>
            </Card>
          </div>

          {/* Countries Visited */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Countries Visited
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {travelPatterns.data.countriesVisited.map((country, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {country}
                  </div>
                  <div className="text-xs text-gray-500">
                    {travelPatterns.data.travelFrequency[country] || 0} visits
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Travel Frequency */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Travel Frequency by Country
            </h3>
            <div className="space-y-3">
              {Object.entries(travelPatterns.data.travelFrequency)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([country, frequency]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">
                      {country}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(frequency / Math.max(...Object.values(travelPatterns.data.travelFrequency))) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600 w-8">
                        {frequency}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Travel Trends */}
          {travelPatterns.data.travelTrends.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Travel Trends
              </h3>
              <div className="space-y-3">
                {travelPatterns.data.travelTrends.map((trend, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900">
                      {trend.title || `Trend ${index + 1}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {trend.description || 'Travel pattern detected'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
