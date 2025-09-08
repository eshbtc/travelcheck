import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Card from '../components/ui/Card';
import StatsCard from '../components/ui/StatsCard';
import FeatureCard from '../components/ui/FeatureCard';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import {
  DocumentTextIcon,
  ChartBarIcon,
  TrophyIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const Home: React.FC = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the landing page if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>TravelCheck - Travel History Tracker</title>
        <meta name="description" content="Track your travel history for USCIS citizenship applications" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout>
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-text-primary sm:text-5xl md:text-6xl">
              Welcome{user ? `, ${user.email?.split('@')[0]}` : ''}!
            </h1>
            <p className="mt-3 max-w-3xl mx-auto text-lg text-text-secondary">
              {user 
                ? "You're on a roll! Continue tracking your travel history for your USCIS citizenship application."
                : "Track your international travel history for USCIS citizenship applications using AI-powered passport stamp analysis and email integration."
              }
            </p>
          </div>

          {/* Stats Section */}
          {user && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Travel Records"
                value="0"
                description="total created"
                icon={<DocumentTextIcon className="h-6 w-6 text-kaggle-blue" />}
              />
              <StatsCard
                title="Reports Generated"
                value="0"
                description="total created"
                icon={<ChartBarIcon className="h-6 w-6 text-kaggle-teal" />}
              />
              <StatsCard
                title="Days Tracked"
                value="0"
                description="total days"
                icon={<ClockIcon className="h-6 w-6 text-kaggle-yellow" />}
              />
              <StatsCard
                title="Completion Rate"
                value="0%"
                description="to Expert"
                icon={<TrophyIcon className="h-6 w-6 text-kaggle-green" />}
              />
            </div>
          )}

          {/* How to Start Section */}
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-primary">
                How to start: Choose a focus for today
              </h2>
              <p className="mt-2 text-text-secondary">
                Help us make relevant suggestions for you
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                title="Upload Passport Stamps"
                description="Use AI-powered OCR to extract travel information from passport stamps and entry/exit records."
                icon={<DocumentTextIcon className="h-8 w-8 text-kaggle-blue" />}
                actionText="Get started"
                gradient="blue"
                onAction={() => console.log('Upload stamps')}
              />
              <FeatureCard
                title="Connect Email Accounts"
                description="Integrate with Gmail and Office 365 to automatically parse flight confirmation emails."
                icon={<GlobeAltIcon className="h-8 w-8 text-kaggle-teal" />}
                actionText="Get started"
                gradient="teal"
                onAction={() => console.log('Connect email')}
              />
              <FeatureCard
                title="Generate USCIS Report"
                description="Create comprehensive travel history reports formatted specifically for USCIS citizenship applications."
                icon={<ShieldCheckIcon className="h-8 w-8 text-kaggle-green" />}
                actionText="Get started"
                gradient="green"
                onAction={() => console.log('Generate report')}
              />
            </div>
          </div>

          {/* Features Section */}
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-text-primary">
                Everything You Need for USCIS Applications
              </h2>
              <p className="mt-2 text-text-secondary">
                Our comprehensive platform handles all aspects of travel history compilation
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="text-center" padding="lg">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-blue/10 mx-auto mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-kaggle-blue" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Passport Stamp OCR</h3>
                <p className="text-text-secondary text-sm">Automatically extract travel dates and locations from passport stamps using advanced OCR technology.</p>
              </Card>

              <Card className="text-center" padding="lg">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-teal/10 mx-auto mb-4">
                  <GlobeAltIcon className="h-6 w-6 text-kaggle-teal" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Email Integration</h3>
                <p className="text-text-secondary text-sm">Connect your Gmail and Office365 accounts to automatically find flight confirmation emails.</p>
              </Card>

              <Card className="text-center" padding="lg">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-yellow/10 mx-auto mb-4">
                  <ClockIcon className="h-6 w-6 text-kaggle-yellow" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">Flight Tracking</h3>
                <p className="text-text-secondary text-sm">Cross-reference with flight tracking apps like Flighty for complete travel history.</p>
              </Card>

              <Card className="text-center" padding="lg">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-kaggle-green/10 mx-auto mb-4">
                  <ShieldCheckIcon className="h-6 w-6 text-kaggle-green" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">USCIS Compliant</h3>
                <p className="text-text-secondary text-sm">Generate reports that meet USCIS requirements for citizenship applications.</p>
              </Card>
            </div>
          </div>

          {/* Quick Actions */}
          {user ? (
            <Card className="text-center" padding="lg">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Ready to continue your journey?
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="w-full sm:w-auto">
                  View Travel History
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Upload New Documents
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="text-center" padding="lg">
              <h3 className="text-xl font-semibold text-text-primary mb-4">
                Get started with TravelCheck
              </h3>
              <p className="text-text-secondary mb-6">
                Sign in to start tracking your travel history for your USCIS citizenship application.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/auth/login')}
                >
                  Sign In
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => router.push('/auth/register')}
                >
                  Create Account
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Home;