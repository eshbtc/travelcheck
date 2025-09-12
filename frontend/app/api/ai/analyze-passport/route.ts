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

// Extract stamps from OCR text using pattern matching
function extractStampsFromText(text: string): any[] {
  const stamps: any[] = []
  
  // Common date patterns for passport stamps
  const datePatterns = [
    /\b(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2,4})\b/g, // DD/MM/YYYY or MM/DD/YYYY
    /\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})\b/gi, // DD MON YYYY
    /\b(\d{4})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\b/g // YYYY/MM/DD
  ]
  
  // Country/location patterns
  const locationPatterns = [
    /\b([A-Z]{2,3})\s*(?:ENTRY|EXIT|ARRIVAL|DEPARTURE)\b/gi,
    /\b(?:ENTRY|EXIT|ARRIVAL|DEPARTURE)\s*([A-Z]{2,3})\b/gi,
    /\b(IMMIGRATION|CUSTOMS)\s+([A-Z\s]{3,20})\b/gi
  ]
  
  // Entry/Exit patterns
  const entryExitPatterns = [
    /\b(ENTRY|ARRIVAL|ADMITTED)\b/gi,
    /\b(EXIT|DEPARTURE|DEPARTED)\b/gi
  ]
  
  // Find dates
  const foundDates: any[] = []
  datePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      let dateStr = match[0]
      let parsedDate
      
      try {
        // Try to parse the date
        if (match[0].includes('JAN') || match[0].includes('FEB') || match[0].includes('MAR') || 
            match[0].includes('APR') || match[0].includes('MAY') || match[0].includes('JUN') ||
            match[0].includes('JUL') || match[0].includes('AUG') || match[0].includes('SEP') ||
            match[0].includes('OCT') || match[0].includes('NOV') || match[0].includes('DEC')) {
          parsedDate = new Date(match[0])
        } else if (match[3]) {
          // Assume DD/MM/YYYY format for European passports
          parsedDate = new Date(`${match[2]}/${match[1]}/${match[3]}`)
        } else {
          parsedDate = new Date(match[0])
        }
        
        if (!isNaN(parsedDate.getTime())) {
          foundDates.push({
            date: parsedDate.toISOString().split('T')[0],
            originalText: dateStr,
            position: match.index
          })
        }
      } catch {
        // Skip invalid dates
      }
    }
  })
  
  // Find locations
  const foundLocations: any[] = []
  locationPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      foundLocations.push({
        location: match[1] || match[2],
        type: match[0].toLowerCase().includes('entry') || match[0].toLowerCase().includes('arrival') ? 'entry' : 
              match[0].toLowerCase().includes('exit') || match[0].toLowerCase().includes('departure') ? 'exit' : 'unknown',
        position: match.index
      })
    }
  })
  
  // Find entry/exit indicators
  const foundTypes: any[] = []
  entryExitPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(text)) !== null) {
      foundTypes.push({
        type: match[1].toLowerCase().includes('entry') || match[1].toLowerCase().includes('arrival') || match[1].toLowerCase().includes('admitted') ? 'entry' : 'exit',
        position: match.index
      })
    }
  })
  
  // Try to associate dates with locations and types based on proximity
  foundDates.forEach(dateInfo => {
    // Find closest location and type
    let closestLocation = null
    let closestType = null
    let minLocationDistance = Infinity
    let minTypeDistance = Infinity
    
    foundLocations.forEach(location => {
      const distance = Math.abs(dateInfo.position - location.position)
      if (distance < minLocationDistance && distance < 100) { // Within 100 characters
        minLocationDistance = distance
        closestLocation = location
      }
    })
    
    foundTypes.forEach(type => {
      const distance = Math.abs(dateInfo.position - type.position)
      if (distance < minTypeDistance && distance < 50) { // Within 50 characters
        minTypeDistance = distance
        closestType = type
      }
    })
    
    stamps.push({
      type: closestType?.type || closestLocation?.type || 'unknown',
      date: dateInfo.date,
      country: closestLocation?.location || null,
      location: closestLocation?.location || null,
      confidence: (closestLocation && closestType) ? 0.8 : (closestLocation || closestType) ? 0.6 : 0.4,
      extractedFrom: 'ocr_text',
      originalText: dateInfo.originalText
    })
  })
  
  return stamps
}

// Validate and deduplicate stamps
function validateAndDeduplicateStamps(stamps: any[]): any[] {
  const validated: any[] = []
  const seen = new Set()
  
  stamps.forEach(stamp => {
    // Skip stamps without dates
    if (!stamp.date) return
    
    // Create unique key for deduplication
    const key = `${stamp.date}-${stamp.country || 'unknown'}-${stamp.type}`
    if (seen.has(key)) return
    seen.add(key)
    
    // Validate date format
    try {
      const date = new Date(stamp.date)
      if (isNaN(date.getTime())) return
      
      // Only include recent stamps (within reasonable passport timeframe)
      const now = new Date()
      const stampDate = new Date(stamp.date)
      const yearsAgo = (now.getTime() - stampDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      
      if (yearsAgo > 20 || yearsAgo < -1) return // Skip stamps older than 20 years or in the future
      
      validated.push({
        type: stamp.type || 'unknown',
        date: stamp.date,
        country: stamp.country,
        location: stamp.location,
        confidence: Math.min(stamp.confidence || 0.5, 1.0),
        metadata: {
          extractedFrom: stamp.extractedFrom || 'document_ai',
          originalText: stamp.originalText
        }
      })
    } catch {
      // Skip invalid stamps
    }
  })
  
  // Sort by date
  return validated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
          // Stamp-related entities
          case 'entry_date':
          case 'exit_date':
          case 'stamp_date':
            stamps.push({
              type: type.includes('entry') ? 'entry' : type.includes('exit') ? 'exit' : 'unknown',
              date: value,
              country: null, // Will be enhanced below
              location: null,
              confidence: entity.confidence || 0.8
            })
            break
          case 'country':
          case 'country_code':
          case 'location':
            // Try to associate with recent stamp or create new one
            if (stamps.length > 0 && !stamps[stamps.length - 1].country) {
              stamps[stamps.length - 1].country = value
            } else {
              stamps.push({
                type: 'unknown',
                date: null,
                country: value,
                location: type === 'location' ? value : null,
                confidence: entity.confidence || 0.7
              })
            }
            break
        }
      }
    }

    // Enhanced stamp extraction using OCR text analysis
    const fullText = result.document.text || ''
    const textStamps = extractStampsFromText(fullText)
    
    // Merge detected stamps with entity-based stamps
    const allStamps = [...stamps, ...textStamps]
    
    // Deduplicate and validate stamps
    const validatedStamps = validateAndDeduplicateStamps(allStamps)

    return NextResponse.json({
      success: true,
      data: {
        personalInfo,
        stamps: validatedStamps
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
