import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Configuration
const API_KEY = process.env.GOOGLE_AI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { travelData } = await request.json()
    
    if (!travelData) {
      return NextResponse.json({ success: false, error: 'No travel data provided' }, { status: 400 })
    }

    if (!API_KEY) {
      return NextResponse.json({ success: false, error: 'Google AI API key not configured' }, { status: 500 })
    }

    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    
    const prompt = `
      Analyze the following travel data and provide insights on travel patterns, 
      citizenship/residency opportunities, and recommendations:
      
      ${JSON.stringify(travelData, null, 2)}
      
      Please provide a JSON response with:
      1. patterns: Array of travel patterns identified
      2. insights: Array of actionable insights and opportunities
      
      Focus on:
      - Residency requirements analysis
      - Tax residency implications
      - Citizenship eligibility patterns
      - Visa optimization opportunities
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
      // If JSON parsing fails, return structured fallback
      return NextResponse.json({
        success: true,
        data: {
          patterns: [],
          insights: [{
            type: 'info',
            title: 'Analysis Complete',
            description: text.substring(0, 200) + '...',
            priority: 'medium'
          }]
        }
      })
    }
  } catch (error) {
    console.error('Error analyzing travel patterns:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    }, { status: 500 })
  }
}