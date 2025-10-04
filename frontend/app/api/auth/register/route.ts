import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * User Registration API Route
 *
 * Creates a new user with email/password credentials.
 * Password is hashed with bcrypt before storage.
 * Returns the created user (without password hash) on success.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password with bcrypt (salt rounds: 10)
    const passwordHash = await bcrypt.hash(password, 10)

    // Generate UUID for new user
    const userId = crypto.randomUUID()

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        passwordHash,
        displayName: name || email.split('@')[0],
        provider: 'credentials',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)

    // Handle Prisma unique constraint errors
    if ((error as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again later.' },
      { status: 500 }
    )
  }
}
