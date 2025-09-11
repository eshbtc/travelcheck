import React, { useState } from 'react';
import Card from './ui/Card';
import { Button } from './ui/Button';
import { universalTravelService } from '../services/universalService';
import { UserProfile, UseCase } from '../types/universal';

interface UserOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
}

const USE_CASES = [
  {
    id: 'citizenship',
    category: 'immigration',
    title: 'Citizenship Application',
    description: 'Track physical presence requirements for citizenship applications',
    countries: ['US', 'Canada', 'UK', 'Australia', 'Germany', 'France'],
    icon: '🏛️'
  },
  {
    id: 'tax_residency',
    category: 'tax',
    title: 'Tax Residency Determination',
    description: 'Calculate tax residency status and treaty benefits',
    countries: ['US', 'UK', 'Canada', 'Australia', 'Germany', 'France'],
    icon: '💰'
  },
  {
    id: 'visa_application',
    category: 'visa',
    title: 'Visa Applications',
    description: 'Document travel history for visa applications',
    countries: ['US', 'UK', 'Canada', 'Australia', 'EU', 'Japan'],
    icon: '📋'
  },
  {
    id: 'personal_tracking',
    category: 'personal',
    title: 'Personal Travel Tracking',
    description: 'Keep track of your travel history and experiences',
    countries: ['All'],
    icon: '✈️'
  },
  {
    id: 'business_travel',
    category: 'business',
    title: 'Business Travel Management',
    description: 'Track business trips for expense reports and compliance',
    countries: ['All'],
    icon: '💼'
  },
  {
    id: 'legal_compliance',
    category: 'legal',
    title: 'Legal & Compliance',
    description: 'Document travel for legal proceedings or compliance requirements',
    countries: ['All'],
    icon: '⚖️'
  }
];

const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' }
];

export const UserOnboarding: React.FC<UserOnboardingProps> = ({
  onComplete,
  onSkip
}) => {
  const [step, setStep] = useState(1);
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [timezone, setTimezone] = useState('UTC');
  const [loading, setLoading] = useState(false);

  const handleUseCaseSelect = (useCaseId: string) => {
    setSelectedUseCase(useCaseId);
    const useCase = USE_CASES.find(uc => uc.id === useCaseId);
    if (useCase && useCase.countries[0] !== 'All') {
      setSelectedCountries(useCase.countries.slice(0, 3)); // Pre-select first 3 countries
    }
  };

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryCode)
        ? prev.filter(c => c !== countryCode)
        : [...prev, countryCode]
    );
  };

  const handleComplete = async () => {
    if (!selectedUseCase || selectedCountries.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const useCase = USE_CASES.find(uc => uc.id === selectedUseCase);
      const profile: UserProfile = {
        id: 'current-user', // This would come from auth
        primaryUseCase: {
          category: useCase?.category as any,
          subcategory: useCase?.id || 'personal_tracking',
          description: useCase?.description || '',
          priority: 'high'
        },
        targetCountries: selectedCountries,
        timezone,
        preferences: {
          defaultTimezone: timezone,
          dateFormat: 'MM/DD/YYYY',
          numberFormat: 'en-US',
          language: 'en',
          notifications: {
            email: true,
            push: true,
            reportReady: true,
            dataConflicts: true,
            ruleUpdates: true
          },
          privacy: {
            dataRetention: 365,
            shareAnalytics: false,
            allowResearch: false,
            exportFormat: ['pdf', 'excel', 'json']
          }
        },
        subscriptions: [{
          plan: 'free',
          features: ['basic_reports', 'email_sync', 'manual_entry'],
          limits: { reports_per_month: 5, countries: 3 }
        }]
      };

      await universalTravelService.updateUserProfile(profile);
      onComplete(profile);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🚀 Welcome to Travel Tracker
        </h2>
        <p className="text-gray-600">
          Let&#39;s set up your account for the best experience
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          What&#39;s your primary use case?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {USE_CASES.map(useCase => (
            <Card
              key={useCase.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedUseCase === useCase.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleUseCaseSelect(useCase.id)}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{useCase.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{useCase.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {useCase.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onSkip}>
          Skip for now
        </Button>
        <Button
          onClick={() => setStep(2)}
          disabled={!selectedUseCase}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Which countries are you interested in?
        </h2>
        <p className="text-gray-600">
          Select the countries you want to track for your use case
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Available Countries
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {COUNTRIES.map(country => (
            <Card
              key={country.code}
              className={`p-3 cursor-pointer transition-all ${
                selectedCountries.includes(country.code)
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleCountryToggle(country.code)}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm font-medium">{country.name}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Your Timezone
        </h3>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="UTC">UTC (Coordinated Universal Time)</option>
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET/CEST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Asia/Dubai">Dubai (GST)</option>
          <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
        </select>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button
          onClick={handleComplete}
          disabled={selectedCountries.length === 0 || loading}
        >
          {loading ? 'Setting up...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="p-8">
        {step === 1 ? renderStep1() : renderStep2()}
      </Card>
    </div>
  );
};
