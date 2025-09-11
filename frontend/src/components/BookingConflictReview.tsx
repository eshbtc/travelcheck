import React, { useState } from 'react';
import { Button } from './ui/Button';
import Card from './ui/Card';
import { universalTravelService } from '../services/universalService';

interface ConflictEntry {
  date: string;
  country: string;
  conflicts?: Array<{ type: string; countries?: string[]; sources?: Array<{country: string; tags: string[]}> }>;
  sourceTags?: string[];
}

export const BookingConflictReview: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const report = await universalTravelService.generateUniversalReport(
        { category: 'travel_summary', subcategory: 'conflicts', purpose: 'Review booking conflicts', requirements: [] },
        'ALL',
        { start: '2020-01-01', end: new Date().toISOString().split('T')[0] },
        { includeEvidence: false, includeConflicts: true }
      );
      const presence = (report.data?.presenceCalendar || []) as any[];
      const withBooking = presence.filter(p => (p.sourceTags || []).includes('hotel_booking') && (p.conflicts || []).length > 0);
      setConflicts(withBooking.map(p => ({ date: p.date, country: p.zone || p.country, conflicts: p.conflicts, sourceTags: p.sourceTags })));
    } catch (e) {
      console.error('Failed to load booking conflicts', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">🏨 Booking Conflict Review</h2>
        <Button variant="outline" onClick={loadConflicts} disabled={loading}>
          {loading ? 'Loading…' : 'Load Conflicts'}
        </Button>
      </div>
      {conflicts.length === 0 ? (
        <div className="text-sm text-gray-600">No booking-related conflicts found. Click Load Conflicts to refresh.</div>
      ) : (
        <div className="space-y-3">
          {conflicts.map((c, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded">
              <div className="font-medium">{c.date} — {c.country}</div>
              <div className="text-xs text-gray-600">Sources: {(c.sourceTags || []).join(', ')}</div>
              {c.conflicts?.map((conf, i) => (
                <div key={i} className="text-sm mt-1">
                  <span className="font-semibold">{conf.type}</span>
                  {conf.countries && (
                    <span className="ml-2">[{conf.countries.join(', ')}]</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

