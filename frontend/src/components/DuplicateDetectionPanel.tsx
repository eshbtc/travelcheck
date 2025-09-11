import React, { useState, useEffect } from 'react';
import { 
  detectDuplicateScans, 
  getDuplicateResults, 
  resolveDuplicate 
} from '../services/firebaseFunctions';
import type { 
  DuplicateDetectionResult, 
  DuplicateRecord 
} from '../types/firebase';
import { Button } from './ui/Button';
import Card from './ui/Card';

interface DuplicateDetectionPanelProps {
  onRefresh?: () => void;
}

export const DuplicateDetectionPanel: React.FC<DuplicateDetectionPanelProps> = ({ onRefresh }) => {
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateRecord | null>(null);
  const [resolutionAction, setResolutionAction] = useState<string>('');
  const [showResolutionModal, setShowResolutionModal] = useState(false);

  // Load existing duplicate results on mount
  useEffect(() => {
    loadDuplicateResults();
  }, []);

  const loadDuplicateResults = async () => {
    try {
      setLoading(true);
      const result = await getDuplicateResults();
      if (result.success && result.data) {
        setDuplicates(result.data);
      }
    } catch (error) {
      console.error('Error loading duplicate results:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDuplicateDetection = async () => {
    try {
      setDetecting(true);
      const result = await detectDuplicateScans();
      if (result.success && result.data) {
        setDuplicates(result.data.duplicates || []);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error detecting duplicates:', error);
    } finally {
      setDetecting(false);
    }
  };

  const handleResolveDuplicate = async (duplicateId: string, action: string) => {
    try {
      const result = await resolveDuplicate(duplicateId, action);
      if (result.success) {
        // Remove resolved duplicate from list
        setDuplicates(prev => prev.filter(d => d.id !== duplicateId));
        setShowResolutionModal(false);
        setSelectedDuplicate(null);
        setResolutionAction('');
      }
    } catch (error) {
      console.error('Error resolving duplicate:', error);
    }
  };

  const openResolutionModal = (duplicate: DuplicateRecord) => {
    setSelectedDuplicate(duplicate);
    setShowResolutionModal(true);
  };

  const getDuplicateTypeIcon = (type: string) => {
    switch (type) {
      case 'image_duplicate':
        return '🖼️';
      case 'stamp_duplicate':
        return '📄';
      default:
        return '❓';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'bg-red-100 text-red-800';
    if (similarity >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Duplicate Detection</h2>
          <p className="text-gray-600 mt-1">
            Detect and resolve duplicate passport scans and travel entries
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={loadDuplicateResults}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            onClick={runDuplicateDetection}
            disabled={detecting}
            variant="primary"
          >
            {detecting ? 'Detecting...' : 'Run Detection'}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {duplicates.length}
          </div>
          <div className="text-sm text-gray-600">Total Duplicates</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">
            {duplicates.filter(d => d.type === 'image_duplicate').length}
          </div>
          <div className="text-sm text-gray-600">Image Duplicates</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {duplicates.filter(d => d.type === 'stamp_duplicate').length}
          </div>
          <div className="text-sm text-gray-600">Stamp Duplicates</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {duplicates.filter(d => d.status === 'resolved').length}
          </div>
          <div className="text-sm text-gray-600">Resolved</div>
        </Card>
      </div>

      {/* Duplicates List */}
      {duplicates.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Duplicates Found
          </h3>
          <p className="text-gray-600 mb-4">
            Run duplicate detection to scan your passport images and travel data for potential duplicates.
          </p>
          <Button onClick={runDuplicateDetection} variant="primary">
            Run Detection
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((duplicate) => (
            <Card key={duplicate.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">
                    {getDuplicateTypeIcon(duplicate.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {duplicate.type === 'image_duplicate' ? 'Image Duplicate' : 'Stamp Duplicate'}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(duplicate.similarity)}`}>
                        {Math.round(duplicate.similarity * 100)}% Similar
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(duplicate.confidence)}`}>
                        {duplicate.confidence}% Confidence
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      Detected on {new Date(duplicate.detectedAt).toLocaleDateString()}
                    </div>

                    {duplicate.type === 'stamp_duplicate' && duplicate.stamps && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Similar Stamps:</h4>
                        <div className="space-y-2">
                          {duplicate.stamps.map((stamp, index) => (
                            <div key={index} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {stamp.country} - {stamp.entryDate || stamp.exitDate || 'Unknown Date'}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {stamp.location && `${stamp.location} • `}
                                    {stamp.rawText && stamp.rawText.substring(0, 100)}...
                                  </div>
                                </div>
                                <div className="text-sm text-gray-500">
                                  {stamp.confidence}% confidence
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        duplicate.status === 'resolved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {duplicate.status === 'resolved' ? 'Resolved' : 'Pending Review'}
                      </span>
                    </div>
                  </div>
                </div>

                {duplicate.status === 'pending_review' && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => openResolutionModal(duplicate)}
                      variant="outline"
                      size="sm"
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {showResolutionModal && selectedDuplicate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resolve Duplicate
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                How would you like to resolve this duplicate?
              </p>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="resolution"
                    value="keep_original"
                    checked={resolutionAction === 'keep_original'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Keep original, remove duplicate</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="resolution"
                    value="keep_duplicate"
                    checked={resolutionAction === 'keep_duplicate'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Keep duplicate, remove original</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="resolution"
                    value="merge"
                    checked={resolutionAction === 'merge'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Merge data from both entries</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="resolution"
                    value="ignore"
                    checked={resolutionAction === 'ignore'}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Ignore - not a duplicate</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => {
                  setShowResolutionModal(false);
                  setSelectedDuplicate(null);
                  setResolutionAction('');
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleResolveDuplicate(selectedDuplicate.id, resolutionAction)}
                disabled={!resolutionAction}
                variant="primary"
              >
                Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
