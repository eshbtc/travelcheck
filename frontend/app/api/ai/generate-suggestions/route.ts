import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configuration
const API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { userData } = await request.json()
    
    if (!userData) {
      return NextResponse.json({ success: false, error: 'No user data provided' }, { status: 400 })
    }

    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Google AI API key not configured' }, { status: 500 })
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    
    const prompt = `
      Analyze the user's travel data and generate smart suggestions:
      
      ${JSON.stringify(userData, null, 2)}
      
      Please provide a JSON response with:
      1. suggestions: Actionable recommendations
      2. conflictingData: Any data conflicts found
      3. potentialGaps: Missing travel information gaps
      
      Focus on data quality, compliance opportunities, and optimization suggestions.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    try {
      const parsedData = JSON.parse(text)
      return NextResponse.json({
        success: true,
        data: parsedData
      })
    } catch {
      return NextResponse.json({
        success: true,
        data: {
          suggestions: [],
          conflictingData: [],
          potentialGaps: []
        }
      })
    }
  } catch (error) {
    console.error('Error generating smart suggestions:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Suggestions generation failed'
    }, { status: 500 })
  }
}