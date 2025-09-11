import { NextRequest, NextResponse } from 'next/server'

const COUNTRIES = [
  { code: 'US', name: 'United States', continent: 'North America' },
  { code: 'CA', name: 'Canada', continent: 'North America' },
  { code: 'MX', name: 'Mexico', continent: 'North America' },
  { code: 'GB', name: 'United Kingdom', continent: 'Europe' },
  { code: 'FR', name: 'France', continent: 'Europe' },
  { code: 'DE', name: 'Germany', continent: 'Europe' },
  { code: 'IT', name: 'Italy', continent: 'Europe' },
  { code: 'ES', name: 'Spain', continent: 'Europe' },
  { code: 'NL', name: 'Netherlands', continent: 'Europe' },
  { code: 'CH', name: 'Switzerland', continent: 'Europe' },
  { code: 'AU', name: 'Australia', continent: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', continent: 'Oceania' },
  { code: 'JP', name: 'Japan', continent: 'Asia' },
  { code: 'KR', name: 'South Korea', continent: 'Asia' },
  { code: 'CN', name: 'China', continent: 'Asia' },
  { code: 'IN', name: 'India', continent: 'Asia' },
  { code: 'SG', name: 'Singapore', continent: 'Asia' },
  { code: 'TH', name: 'Thailand', continent: 'Asia' },
  { code: 'BR', name: 'Brazil', continent: 'South America' },
  { code: 'AR', name: 'Argentina', continent: 'South America' },
  { code: 'CL', name: 'Chile', continent: 'South America' },
  { code: 'ZA', name: 'South Africa', continent: 'Africa' },
  { code: 'EG', name: 'Egypt', continent: 'Africa' },
  { code: 'MA', name: 'Morocco', continent: 'Africa' },
  { code: 'AE', name: 'United Arab Emirates', continent: 'Asia' },
  { code: 'SA', name: 'Saudi Arabia', continent: 'Asia' },
  { code: 'RU', name: 'Russia', continent: 'Europe/Asia' },
  { code: 'TR', name: 'Turkey', continent: 'Europe/Asia' },
  { code: 'IL', name: 'Israel', continent: 'Asia' },
  { code: 'JO', name: 'Jordan', continent: 'Asia' }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const continent = searchParams.get('continent')
    const search = searchParams.get('search')?.toLowerCase()

    let filteredCountries = COUNTRIES

    if (continent) {
      filteredCountries = filteredCountries.filter(country => 
        country.continent.toLowerCase().includes(continent.toLowerCase())
      )
    }

    if (search) {
      filteredCountries = filteredCountries.filter(country => 
        country.name.toLowerCase().includes(search) || 
        country.code.toLowerCase().includes(search)
      )
    }

    // Group by continent
    const byContinent = filteredCountries.reduce((acc: any, country) => {
      const cont = country.continent
      if (!acc[cont]) acc[cont] = []
      acc[cont].push(country)
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      countries: filteredCountries,
      byContinent,
      total: filteredCountries.length,
      continents: Array.from(new Set(COUNTRIES.map(c => c.continent)))
    })
  } catch (error) {
    console.error('Error fetching available countries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch countries' },
      { status: 500 }
    )
  }
}