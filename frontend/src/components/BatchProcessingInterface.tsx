import React, { useState, useRef, useCallback } from 'react';
import { 
  processBatchPassportImages, 
  optimizeBatchProcessing 
} from '@/services/supabaseService';
import type { 
  BatchProcessingResult, 
  OptimizationResult 
} from '@/types/universal';
import { Button } from './ui/Button';
import Card from './ui/Card';

interface BatchProcessingInterfaceProps {
  onProcessingComplete?: (result: BatchProcessingResult) => void;
}

interface ImageFile {
  file: File;
  id: string;
  preview: string;
  hash?: string;
}

export const BatchProcessingInterface: React.FC<BatchProcessingInterfaceProps> = ({ 
  onProcessingComplete 
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [processingResult, setProcessingResult] = useState<BatchProcessingResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (files: File[]) => {
    const imageFiles = files
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview: URL.createObjectURL(file)
      }));
    
    setImages(prev => [...prev, ...imageFiles]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAllImages = () => {
    images.forEach(image => URL.revokeObjectURL(image.preview));
    setImages([]);
    setProcessingResult(null);
    setOptimization(null);
  };

  const optimizeBatch = async () => {
    if (images.length === 0) return;

    try {
      setOptimizing(true);
      const imageDataArray = images.map(img => ({
        fileName: img.file.name,
        size: img.file.size,
        type: img.file.type
      }));

      const result = await optimizeBatchProcessing(imageDataArray);
      if (result.success) {
        setOptimization(result);
      }
    } catch (error) {
      console.error('Error optimizing batch:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const processBatch = async () => {
    if (images.length === 0) return;

    try {
      setProcessing(true);
      
      // Convert images to base64
      const imageDataArray = images.map((img) => ({
        file: img.file,
        fileName: img.file.name
      }));

      const result = await processBatchPassportImages(imageDataArray);
      if (result.success) {
        setProcessingResult(result);
        if (onProcessingComplete) {
          onProcessingComplete(result);
        }
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    } finally {
      setProcessing(false);
    }
  };

  const compressImageToBase64 = (file: File, maxDim = 2000, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', quality);
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/...;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Batch Processing</h2>
          <p className="text-gray-600 mt-1">
            Process multiple passport images efficiently with cost optimization
          </p>
        </div>
        <div className="flex space-x-3">
          {images.length > 0 && (
            <Button onClick={clearAllImages} variant="outline">
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <Card className="p-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Upload Passport Images
          </h3>
          <p className="text-gray-600 mb-4">
            Drag and drop images here, or click to select files
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="primary"
          >
            Select Images
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      </Card>

      {/* Images Preview */}
      {images.length > 0 && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Selected Images ({images.length})
            </h3>
            <div className="flex space-x-2">
              <Button
                onClick={optimizeBatch}
                disabled={optimizing}
                variant="outline"
                size="sm"
              >
                {optimizing ? 'Optimizing...' : 'Optimize'}
              </Button>
              <Button
                onClick={processBatch}
                disabled={processing}
                variant="primary"
                size="sm"
              >
                {processing ? 'Processing...' : 'Process Batch'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.preview}
                    alt={image.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                  <Button
                    onClick={() => removeImage(image.id)}
                    variant="outline"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Remove
                  </Button>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-900 truncate">
                    {image.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(image.file.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Optimization Results */}
      {optimization && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Optimization Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {optimization.data?.batchSize || 0}
              </div>
              <div className="text-sm text-blue-600">Images</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                ${optimization.data?.estimatedCost?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-green-600">Estimated Cost</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {optimization.data?.suggestedBatchSize || 0}
              </div>
              <div className="text-sm text-purple-600">Suggested Batch Size</div>
            </div>
          </div>

          {optimization.data?.optimizations && optimization.data.optimizations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h4>
              <div className="space-y-2">
                {optimization.data?.optimizations?.map((opt, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-yellow-600 mt-0.5">
                      {opt.impact === 'performance' ? '⚡' : '💰'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-yellow-800">
                        {opt.type === 'batch_size' ? 'Batch Size' : 'Cost Optimization'}
                      </div>
                      <div className="text-sm text-yellow-700">
                        {opt.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Processing Results */}
      {processingResult && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Processing Results
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {processingResult.data?.total || 0}
              </div>
              <div className="text-sm text-blue-600">Total</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {processingResult.data?.processed || 0}
              </div>
              <div className="text-sm text-green-600">Processed</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {processingResult.data?.cached || 0}
              </div>
              <div className="text-sm text-purple-600">Cached</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {processingResult.data?.duplicateCount || 0}
              </div>
              <div className="text-sm text-yellow-600">Duplicates</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {processingResult.data?.errorCount || 0}
              </div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Processed Images:</h4>
            <div className="space-y-2">
              {processingResult.data?.scans?.map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">
                      {scan.fileName}
                    </div>
                    {scan.cached && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Cached
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {scan.data?.confidence ? `${scan.data.confidence}% confidence` : 'Processed'}
                  </div>
                </div>
              ))}
            </div>

            {processingResult.data?.errors && processingResult.data.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Errors:</h4>
                <div className="space-y-2">
                  {processingResult.data?.errors?.map((error, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg">
                      <div className="text-sm font-medium text-red-800">
                        {error.fileName}
                      </div>
                      <div className="text-sm text-red-600">
                        {error.error}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
