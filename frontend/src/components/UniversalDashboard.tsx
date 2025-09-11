import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import { Button } from './ui/Button';
import { universalTravelService } from '../services/universalService';
import { UserProfile, UniversalReport, ReportType } from '../types/universal';
import { BookingConflictReview } from './BookingConflictReview';

interface UniversalDashboardProps {
  userProfile?: UserProfile;
  onProfileUpdate?: (profile: UserProfile) => void;
}

export const UniversalDashboard: React.FC<UniversalDashboardProps> = ({
  userProfile,
  onProfileUpdate
}) => {
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [availableCountries, setAvailableCountries] = useState<any[]>([]);
  const [recentReports, setRecentReports] = useState<UniversalReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load available countries
      const countries = await universalTravelService.getAvailableCountries();
      setAvailableCountries(countries);
      
      // Load current status (placeholder for now)
      setCurrentStatus({
        currentResidence: 'UAE (15 days)',
        totalCountries: 3,
        totalTravelDays: 766,
        longestStay: 'UK (751 days)'
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string, country: string) => {
    try {
      const reportTypeObj: ReportType = {
        category: reportType as any,
        subcategory: 'standard',
        purpose: `Generate ${reportType} report for ${country}`,
        requirements: []
      };

      const report = await universalTravelService.generateUniversalReport(
        reportTypeObj,
        country,
        { start: '2020-01-01', end: new Date().toISOString().split('T')[0] }
      );
      
      setRecentReports(prev => [report, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🌍 Universal Travel & Residence Tracker
        </h1>
        <p className="text-gray-600">
          Track your travel history for any purpose - citizenship, tax residency, visas, and more
        </p>
      </div>

      {/* Current Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Current Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {currentStatus?.currentResidence || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600">Current Residence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {currentStatus?.totalCountries || 0}
            </div>
            <div className="text-sm text-gray-600">Countries Visited</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {currentStatus?.totalTravelDays || 0}
            </div>
            <div className="text-sm text-gray-600">Total Travel Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {currentStatus?.longestStay || 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Longest Stay</div>
          </div>
        </div>
      </Card>

      {/* Report Generation */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🎯 Generate Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">Citizenship Applications</h3>
            <div className="space-y-1">
              {availableCountries.slice(0, 3).map(country => (
                <Button
                  key={country.code}
                  variant="outline"
                  size="sm"
                  onClick={() => generateReport('citizenship', country.code)}
                  className="w-full justify-start"
                >
                  {country.name} Citizenship
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Tax Residency</h3>
            <div className="space-y-1">
              {availableCountries.slice(0, 3).map(country => (
                <Button
                  key={country.code}
                  variant="outline"
                  size="sm"
                  onClick={() => generateReport('tax_residency', country.code)}
                  className="w-full justify-start"
                >
                  {country.name} Tax Residency
                </Button>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Visa Applications</h3>
            <div className="space-y-1">
              {availableCountries.slice(0, 3).map(country => (
                <Button
                  key={country.code}
                  variant="outline"
                  size="sm"
                  onClick={() => generateReport('visa_application', country.code)}
                  className="w-full justify-start"
                >
                  {country.name} Visa
                </Button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => generateReport('travel_summary', 'ALL')}
            >
              📋 Travel Summary
            </Button>
            <Button
              variant="outline"
              onClick={() => generateReport('custom', 'ALL')}
            >
              ⚙️ Custom Report
            </Button>
            <Button
              variant="outline"
              onClick={() => {/* TODO: Implement export */}}
            >
              📤 Export Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Timeline View */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📅 Timeline View</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm">All</Button>
          <Button variant="outline" size="sm">By Country</Button>
          <Button variant="outline" size="sm">By Purpose</Button>
          <Button variant="outline" size="sm">By Year</Button>
        </div>
        <div className="text-center text-gray-500 py-8">
          Timeline visualization coming soon...
        </div>
      </Card>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">📄 Recent Reports</h2>
          <div className="space-y-2">
            {recentReports.map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{report.reportType.category} - {report.country}</div>
                  <div className="text-sm text-gray-600">
                    Generated {new Date(report.generatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View</Button>
                  <Button variant="outline" size="sm">Export</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            variant="outline"
            onClick={() => {/* TODO: Navigate to upload */}}
            className="h-20 flex flex-col items-center justify-center"
          >
            <div className="text-2xl mb-1">📸</div>
            <div className="text-sm">Upload Documents</div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {/* TODO: Navigate to email sync */}}
            className="h-20 flex flex-col items-center justify-center"
          >
            <div className="text-2xl mb-1">📧</div>
            <div className="text-sm">Sync Email</div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {/* TODO: Navigate to manual entry */}}
            className="h-20 flex flex-col items-center justify-center"
          >
            <div className="text-2xl mb-1">✏️</div>
            <div className="text-sm">Manual Entry</div>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {/* TODO: Navigate to settings */}}
            className="h-20 flex flex-col items-center justify-center"
          >
            <div className="text-2xl mb-1">⚙️</div>
            <div className="text-sm">Settings</div>
          </Button>
        </div>
      </Card>

      {/* Booking Conflict Review */}
      <BookingConflictReview />
    </div>
  );
};
