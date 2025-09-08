import React, { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRouter } from 'next/router'
import { Layout } from '../../components/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { extractPassportData } from '../../services/firebaseFunctions'

export default function PassportUploadPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingResults, setProcessingResults] = useState<any[]>([])
  const [error, setError] = useState('')

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, authLoading, router])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }, [])

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      
      if (!isValidType) {
        setError('Please upload only image files (JPG, PNG, etc.)')
        return false
      }
      
      if (!isValidSize) {
        setError('File size must be less than 10MB')
        return false
      }
      
      return true
    })

    setUploadedFiles(prev => [...prev, ...validFiles])
    setError('')
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processImages = async () => {
    if (!user || uploadedFiles.length === 0) return

    setIsProcessing(true)
    setError('')
    const results = []

    try {
      for (const file of uploadedFiles) {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // Remove data:image/...;base64, prefix
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })

        // Call Firebase Function to process the image
        const result = await extractPassportData(base64)
        results.push({
          fileName: file.name,
          result: result.data,
          success: result.success
        })
      }

      setProcessingResults(results)
      
      // Clear uploaded files after processing
      setUploadedFiles([])
      
    } catch (err: any) {
      setError(err.message || 'Failed to process images')
    } finally {
      setIsProcessing(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Passport Images</h1>
          <p className="mt-2 text-gray-600">
            Upload clear images of your passport pages to automatically extract travel stamps and dates.
          </p>
        </div>

        {/* Upload Area */}
        <Card className="p-8">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-brand-primary bg-brand-primary/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-4xl">📄</div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Drop your passport images here
                </h3>
                <p className="text-gray-600">
                  or click to browse files
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" size="lg">
                Choose Files
              </Button>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Supported formats:</strong> JPG, PNG, GIF, WebP</p>
            <p><strong>Maximum file size:</strong> 10MB per file</p>
            <p><strong>Tips for best results:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Ensure good lighting and clear focus</li>
              <li>Include the entire passport page</li>
              <li>Avoid shadows and reflections</li>
              <li>Upload multiple pages for complete history</li>
            </ul>
          </div>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-600">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button
                variant="primary"
                size="lg"
                onClick={processImages}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : `Process ${uploadedFiles.length} Image${uploadedFiles.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </Card>
        )}

        {/* Processing Results */}
        {processingResults.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Processing Results
            </h3>
            <div className="space-y-4">
              {processingResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{result.fileName}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.success
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  
                  {result.success && result.result && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Extracted Text:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {result.result.extractedText || 'No text extracted'}
                        </p>
                      </div>
                      
                      {result.result.structuredData && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Structured Data:</p>
                          <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify(result.result.structuredData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex space-x-4">
              <Button
                variant="primary"
                onClick={() => router.push('/travel/history')}
              >
                View Travel History
              </Button>
              <Button
                variant="outline"
                onClick={() => setProcessingResults([])}
              >
                Clear Results
              </Button>
            </div>
          </Card>
        )}

        {/* Help Section */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>What happens after upload?</strong><br />
              Our AI will analyze your passport images to extract travel stamps, dates, and countries visited.
            </p>
            <p>
              <strong>How accurate is the extraction?</strong><br />
              Our OCR technology is highly accurate, but you can review and edit the extracted information.
            </p>
            <p>
              <strong>Is my data secure?</strong><br />
              Yes, all images are processed securely and stored encrypted in your private account.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
