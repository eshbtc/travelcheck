import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '../../auth/middleware'
import { validateInput, sanitizeForLogging } from '@/lib/validation'
import { z } from 'zod'

const GetCountryRulesSchema = z.object({
  country: z.string().min(2, 'Country code is required').max(3)
})

// Comprehensive country rules database
const COUNTRY_RULES: Record<string, Array<{
  id: string
  name: string
  description: string
  category: string
  requirements: any
  effectiveFrom: string
  effectiveTo?: string
}>> = {
  'US': [
    {
      id: 'us-tax-residency-183',
      name: 'US Tax Residency - Substantial Presence Test',
      description: 'Must be physically present in the US for at least 183 days using the weighted formula: current year days + (1/3 × prior year days) + (1/6 × two years ago days)',
      category: 'tax_residency',
      requirements: {
        daysCurrentYear: { min: 31, description: 'Must be present at least 31 days in current year' },
        totalWeightedDays: { min: 183, description: 'Weighted total must be at least 183 days' },
        exemptions: ['diplomat', 'teacher', 'student', 'professional_athlete'],
        closerConnectionException: true
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'us-visa-b1b2-duration',
      name: 'B-1/B-2 Visitor Visa Duration',
      description: 'Generally allowed up to 6 months per entry, with typical I-94 period determining authorized stay',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 180,
        totalAnnualLimit: null,
        resetPeriod: null,
        notes: 'Duration determined by CBP officer at entry'
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'us-esta-duration',
      name: 'ESTA/VWP Duration Limits',
      description: 'Visa Waiver Program allows up to 90 days per entry, no extensions possible',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 90,
        extensionsAllowed: false,
        countries: ['eligible_vwp_countries'],
        resetRequirement: 'departure_from_north_america'
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'CA': [
    {
      id: 'ca-tax-residency-183',
      name: 'Canada Tax Residency - 183 Day Rule',
      description: 'May become Canadian tax resident if present for 183+ days in a calendar year without significant residential ties elsewhere',
      category: 'tax_residency',
      requirements: {
        daysThreshold: 183,
        residentialTiesRequired: false,
        significantConnections: ['dwelling', 'spouse_dependents', 'personal_property', 'economic_ties']
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'ca-visitor-duration',
      name: 'Canada Visitor Duration',
      description: 'Visitors typically granted up to 6 months per entry',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 180,
        extensionsAllowed: true,
        applicationRequired: 'before_expiry'
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'GB': [
    {
      id: 'uk-tax-residency-srt',
      name: 'UK Statutory Residence Test',
      description: 'Complex test considering days present, accommodation, work, family ties, and previous residence status',
      category: 'tax_residency',
      requirements: {
        automaticResident: {
          days183Plus: true,
          homeInUK: true,
          workInUK: 'full_time'
        },
        sufficientTiesTest: {
          days16to45: { ties: 4, previousResident: true },
          days46to90: { ties: 3, anyStatus: true },
          days91to120: { ties: 2, anyStatus: true },
          days121to182: { ties: 1, anyStatus: true }
        }
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'uk-visitor-duration',
      name: 'UK Standard Visitor Duration',
      description: 'Up to 6 months per visit, with restrictions on frequency of visits',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 180,
        annualGuidance: 'no_more_than_6_months_per_12_months',
        genuineVisitorTest: true
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'DE': [
    {
      id: 'de-tax-residency-183',
      name: 'Germany Tax Residency - 183 Day Rule',
      description: 'May become German tax resident if present for more than 183 days in a calendar year',
      category: 'tax_residency',
      requirements: {
        daysThreshold: 183,
        habitualAbodeTest: true,
        centerOfVitalInterests: ['personal_economic_relations']
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'de-schengen-duration',
      name: 'Germany Schengen Area Duration',
      description: 'Up to 90 days within any 180-day period for short stays',
      category: 'visa_compliance',
      requirements: {
        maxStay: 90,
        rollingPeriod: 180,
        schengenWide: true,
        calculation: 'sliding_window'
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'FR': [
    {
      id: 'fr-tax-residency-foyer',
      name: 'France Tax Residency - Domicile Test',
      description: 'French tax resident if domicile/foyer is in France, or present 183+ days, or principal activity in France',
      category: 'tax_residency',
      requirements: {
        domicileTest: 'foyer_or_principal_residence',
        daysThreshold: 183,
        principalActivityTest: true,
        economicInterestsTest: true
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'fr-schengen-duration',
      name: 'France Schengen Area Duration',
      description: 'Up to 90 days within any 180-day period for short stays',
      category: 'visa_compliance',
      requirements: {
        maxStay: 90,
        rollingPeriod: 180,
        schengenWide: true,
        calculation: 'sliding_window'
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'JP': [
    {
      id: 'jp-tax-residency-1year',
      name: 'Japan Tax Residency - 1 Year Rule',
      description: 'Becomes Japanese tax resident if present for 1 year or more, or has domicile in Japan',
      category: 'tax_residency',
      requirements: {
        daysThreshold: 365,
        domicileTest: true,
        intention: 'permanent_or_1year_plus'
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'jp-tourist-duration',
      name: 'Japan Tourist Visa Duration',
      description: 'Tourist visa allows up to 90 days, extendable in certain circumstances',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 90,
        extensionsAllowed: true,
        maxExtension: 90,
        totalMaxStay: 180
      },
      effectiveFrom: '2024-01-01'
    }
  ],
  'AU': [
    {
      id: 'au-tax-residency-183',
      name: 'Australia Tax Residency - 183 Day Test',
      description: 'May become Australian tax resident if present for 183+ days and no usual place of residence elsewhere',
      category: 'tax_residency',
      requirements: {
        daysThreshold: 183,
        usualPlaceElsewhere: false,
        intentionTest: true,
        domicileTest: true
      },
      effectiveFrom: '2024-01-01'
    },
    {
      id: 'au-visitor-duration',
      name: 'Australia Visitor Visa Duration',
      description: 'Tourist visas typically allow 3-12 months depending on visa type',
      category: 'visa_compliance',
      requirements: {
        maxStayPerEntry: 365,
        multipleEntry: true,
        stayPeriodVaries: 'by_visa_type'
      },
      effectiveFrom: '2024-01-01'
    }
  ]
}

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
    const country = searchParams.get('country')?.toUpperCase()

    // Validate query params
    if (!country) {
      return NextResponse.json(
        { success: false, error: 'Country parameter is required' },
        { status: 400 }
      )
    }

    const validation = validateInput(GetCountryRulesSchema, { country })
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    console.log('Get country rules request:', sanitizeForLogging({ country, userId: user.id }))

    // Get rules for the specified country
    const rules = COUNTRY_RULES[country] || []

    // Filter active rules (no end date or end date in future)
    const activeRules = rules.filter(rule => 
      !rule.effectiveTo || new Date(rule.effectiveTo) > new Date()
    )

    return NextResponse.json({
      success: true,
      data: activeRules,
      meta: {
        country,
        totalRules: activeRules.length,
        categories: Array.from(new Set(activeRules.map(r => r.category)))
      }
    })
  } catch (error) {
    console.error('Error getting country rules:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to get country rules' },
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
    console.log('Bulk country rules request:', sanitizeForLogging({ userId: user.id, countries: body.countries }))
    
    const { countries } = body

    if (!countries || !Array.isArray(countries)) {
      return NextResponse.json(
        { success: false, error: 'Countries array is required' },
        { status: 400 }
      )
    }

    // Get rules for multiple countries
    const result: Record<string, any[]> = {}
    
    countries.forEach((country: string) => {
      const countryCode = country.toUpperCase()
      const rules = COUNTRY_RULES[countryCode] || []
      
      // Filter active rules
      const activeRules = rules.filter(rule => 
        !rule.effectiveTo || new Date(rule.effectiveTo) > new Date()
      )
      
      result[countryCode] = activeRules
    })

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestedCountries: countries.length,
        foundCountries: Object.keys(result).filter(k => result[k].length > 0).length
      }
    })
  } catch (error) {
    console.error('Error getting bulk country rules:', sanitizeForLogging(error))
    return NextResponse.json(
      { success: false, error: 'Failed to get country rules' },
      { status: 500 }
    )
  }
}