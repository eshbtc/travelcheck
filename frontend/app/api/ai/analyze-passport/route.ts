import { NextRequest, NextResponse } from 'next/server'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'

// Configuration with fallbacks
const PROJECT_ID =
  process.env.DOCUMENT_AI_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT_ID ||
  ''
const LOCATION =
  process.env.DOCUMENT_AI_LOCATION ||
  process.env.GOOGLE_CLOUD_DOCUMENT_AI_LOCATION ||
  process.env.GOOGLE_CLOUD_LOCATION ||
  'us-central1'
const PROCESSOR_ID =
  process.env.DOCUMENT_AI_PROCESSOR_ID ||
  process.env.GOOGLE_CLOUD_DOCUMENT_AI_PROCESSOR_ID ||
  ''

function createDocAiClient() {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credsJson) {
    try {
      const creds = JSON.parse(credsJson)
      const client = new DocumentProcessorServiceClient({
        projectId: PROJECT_ID || creds.project_id,
        credentials: {
          client_email: creds.client_email,
          private_key: creds.private_key,
        },
      })
      return client
    } catch (e) {
      // Fall through to ADC if JSON is malformed
    }
  }
  // Default to ADC or env file path via GOOGLE_APPLICATION_CREDENTIALS
  return new DocumentProcessorServiceClient()
}

export async function POST(request: NextRequest) {
  try {
    const { imageData } = await request.json()
    
    if (!imageData) {
      return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 })
    }

    if (!PROJECT_ID) {
      return NextResponse.json({ success: false, error: 'DOCUMENT_AI_PROJECT_ID not configured' }, { status: 500 })
    }
    if (!PROCESSOR_ID) {
      return NextResponse.json({ success: false, error: 'DOCUMENT_AI_PROCESSOR_ID not configured' }, { status: 500 })
    }

    // Initialize Document AI client
    const documentClient = createDocAiClient()
    
    // Process document with Document AI
    const processRequest = {
      name: `projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}`,
      rawDocument: {
        content: imageData,
        mimeType: 'image/jpeg'
      }
    }

    const [result] = await documentClient.processDocument(processRequest)
    
    if (!result.document) {
      throw new Error('No document processed')
    }

    // Parse the results
    const personalInfo: any = {}
    const stamps: any[] = []

    // Extract personal information from entities
    if (result.document.entities) {
      for (const entity of result.document.entities) {
        const type = entity.type?.toLowerCase()
        const value = entity.textAnchor?.content || entity.normalizedValue?.text
        
        switch (type) {
          case 'first_name':
          case 'given_name':
            personalInfo.firstName = value
            break
          case 'last_name':
          case 'surname':
            personalInfo.lastName = value
            break
          case 'nationality':
            personalInfo.nationality = value
            break
          case 'date_of_birth':
          case 'birth_date':
            personalInfo.dateOfBirth = value
            break
          case 'passport_number':
          case 'document_number':
            personalInfo.passportNumber = value
            break
          case 'issue_date':
            personalInfo.issueDate = value
            break
          case 'expiry_date':
          case 'expiration_date':
            personalInfo.expiryDate = value
            break
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        personalInfo,
        stamps
      }
    })
  } catch (error) {
    console.error('Error processing passport image:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
