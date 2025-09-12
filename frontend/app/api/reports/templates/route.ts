import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { supabaseAdmin as supabase } from '@/lib/supabase-server'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const ReportTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(200),
  description: z.string().max(1000).optional(),
  category: z.string().min(1, 'Category is required').max(100),
  country: z.string().min(2, 'Country code is required').max(3),
  template: z.record(z.any()),
  preview: z.string().optional()
})

const GetTemplatesSchema = z.object({
  category: z.string().optional()
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  const { user } = authResult

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Validate query params
    const validation = validateInput(GetTemplatesSchema, { category })
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Get report templates
    let query = supabase
      .from('report_templates')
      .select('*')
      .or(`user_id.eq.${user.id},is_public.eq.true`)
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error } = await query

    if (error) {
      console.error('Supabase error:', sanitizeForLogging(error))
      return NextResponse.json(
        { success: false, error: 'Failed to get templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: templates || []
    })
  } catch (error) {
    console.error('Error getting report templates:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to get report templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json(
      { success: false, error: authResult.error },
      { status: authResult.status || 401 }
    )
  }

  const { user } = authResult

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('Save template request:', sanitizeForLogging(body))
    
    // Validate input data
    const validation = validateInput(ReportTemplateSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const templateData = validation.data!

    // Save the template
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        user_id: user.id,
        name: templateData.name,
        description: templateData.description || '',
        category: templateData.category,
        country: templateData.country,
        template: templateData.template,
        preview: templateData.preview,
        is_public: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', sanitizeForLogging(error))
      return NextResponse.json(
        { success: false, error: 'Failed to save template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template saved successfully',
      data: { id: data.id, ...templateData }
    })
  } catch (error) {
    console.error('Error saving report template:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to save report template' },
      { status: 500 }
    )
  }
}