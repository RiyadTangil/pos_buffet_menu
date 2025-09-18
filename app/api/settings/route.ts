import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Interface for session configuration
interface SessionConfig {
  name: string
  startTime: string
  endTime: string
  adultPrice: number
  childPrice: number
  infantPrice: number
  isActive: boolean
  nextOrderAvailableInMinutes: number
}

// Interface for extra drinks pricing
interface ExtraDrinksPricing {
  adultPrice: number
  childPrice: number
  infantPrice: number
}

// Interface for session-specific extra drinks pricing
interface SessionSpecificExtraDrinksPricing {
  breakfast: ExtraDrinksPricing
  lunch: ExtraDrinksPricing
  dinner: ExtraDrinksPricing
}

// Interface for buffet settings
interface BuffetSettings {
  _id?: ObjectId
  sessions: {
    breakfast: SessionConfig
    lunch: SessionConfig
    dinner: SessionConfig
  }
  extraDrinksPrice: number // Keep for backward compatibility
  extraDrinksPricing: ExtraDrinksPricing // Keep for backward compatibility
  sessionSpecificExtraDrinksPricing: SessionSpecificExtraDrinksPricing
  createdAt?: Date
  updatedAt?: Date
}

// GET - Fetch buffet settings
export async function GET() {
  try {
    const db = await getDatabase()
    const settings = await db.collection(COLLECTIONS.SETTINGS).findOne({ type: 'buffet' })
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = {
        sessions: {
          breakfast: {
            name: 'Breakfast',
            startTime: '07:00',
            endTime: '11:00',
            adultPrice: 20,
            childPrice: 12,
            infantPrice: 0,
            isActive: true,
            nextOrderAvailableInMinutes: 30
          },
          lunch: {
            name: 'Lunch',
            startTime: '12:00',
            endTime: '16:00',
            adultPrice: 25,
            childPrice: 15,
            infantPrice: 0,
            isActive: true,
            nextOrderAvailableInMinutes: 30
          },
          dinner: {
            name: 'Dinner',
            startTime: '18:00',
            endTime: '22:00',
            adultPrice: 30,
            childPrice: 18,
            infantPrice: 0,
            isActive: true,
            nextOrderAvailableInMinutes: 30
          }
        },
        extraDrinksPrice: 5, // Keep for backward compatibility
        extraDrinksPricing: {
          adultPrice: 5,
          childPrice: 3,
          infantPrice: 0
        },
        sessionSpecificExtraDrinksPricing: {
          breakfast: {
            adultPrice: 4,
            childPrice: 2.5,
            infantPrice: 0
          },
          lunch: {
            adultPrice: 5,
            childPrice: 3,
            infantPrice: 0
          },
          dinner: {
            adultPrice: 6,
            childPrice: 3.5,
            infantPrice: 0
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        data: defaultSettings
      })
    }

    // Format response
    const formattedSettings = {
      id: settings._id.toString(),
      sessions: settings.sessions || {
        breakfast: {
          name: 'Breakfast',
          startTime: '07:00',
          endTime: '11:00',
          adultPrice: 20,
          childPrice: 12,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        },
        lunch: {
          name: 'Lunch',
          startTime: '12:00',
          endTime: '16:00',
          adultPrice: 25,
          childPrice: 15,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        },
        dinner: {
          name: 'Dinner',
          startTime: '18:00',
          endTime: '22:00',
          adultPrice: 30,
          childPrice: 18,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        }
      },
      extraDrinksPrice: settings.extraDrinksPrice || 5, // Keep for backward compatibility
      extraDrinksPricing: settings.extraDrinksPricing || {
        adultPrice: settings.extraDrinksPrice || 5,
        childPrice: Math.round((settings.extraDrinksPrice || 5) * 0.6), // 60% of adult price
        infantPrice: 0
      },
      sessionSpecificExtraDrinksPricing: settings.sessionSpecificExtraDrinksPricing || {
        breakfast: {
          adultPrice: 4,
          childPrice: 2.5,
          infantPrice: 0
        },
        lunch: {
          adultPrice: 5,
          childPrice: 3,
          infantPrice: 0
        },
        dinner: {
          adultPrice: 6,
          childPrice: 3.5,
          infantPrice: 0
        }
      },
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: formattedSettings
    })
  } catch (error) {
    console.error('Error fetching buffet settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch buffet settings' },
      { status: 500 }
    )
  }
}

// POST/PUT - Create or update buffet settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessions, extraDrinksPrice, extraDrinksPricing, sessionSpecificExtraDrinksPricing } = body

    // Validation for sessions
    if (sessions) {
      for (const [sessionKey, session] of Object.entries(sessions)) {
        const sessionData = session as SessionConfig
        
        // Validate required fields
        if (!sessionData.name || !sessionData.startTime || !sessionData.endTime) {
          return NextResponse.json(
            { success: false, error: `Session ${sessionKey} is missing required fields` },
            { status: 400 }
          )
        }
        
        // Validate numeric fields
        const numericFields = ['adultPrice', 'childPrice', 'infantPrice', 'nextOrderAvailableInMinutes']
        for (const field of numericFields) {
          const value = sessionData[field as keyof SessionConfig]
          if (typeof value !== 'number' || value < 0) {
            return NextResponse.json(
              { success: false, error: `${sessionKey}.${field} must be a non-negative number` },
              { status: 400 }
            )
          }
        }
        
        // Validate boolean field
        if (typeof sessionData.isActive !== 'boolean') {
          return NextResponse.json(
            { success: false, error: `${sessionKey}.isActive must be a boolean` },
            { status: 400 }
          )
        }
      }
    }

    // Validate extraDrinksPrice
    if (extraDrinksPrice !== undefined && (typeof extraDrinksPrice !== 'number' || extraDrinksPrice < 0)) {
      return NextResponse.json(
        { success: false, error: 'extraDrinksPrice must be a non-negative number' },
        { status: 400 }
      )
    }

    // Validate extraDrinksPricing
    if (extraDrinksPricing !== undefined) {
      const { adultPrice, childPrice, infantPrice } = extraDrinksPricing
      if (typeof adultPrice !== 'number' || adultPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'extraDrinksPricing.adultPrice must be a non-negative number' },
          { status: 400 }
        )
      }
      if (typeof childPrice !== 'number' || childPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'extraDrinksPricing.childPrice must be a non-negative number' },
          { status: 400 }
        )
      }
      if (typeof infantPrice !== 'number' || infantPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'extraDrinksPricing.infantPrice must be a non-negative number' },
          { status: 400 }
        )
      }
    }

    // Validate sessionSpecificExtraDrinksPricing
    if (sessionSpecificExtraDrinksPricing !== undefined) {
      const sessions = ['breakfast', 'lunch', 'dinner'] as const
      for (const sessionKey of sessions) {
        const sessionPricing = sessionSpecificExtraDrinksPricing[sessionKey]
        if (sessionPricing) {
          const { adultPrice, childPrice, infantPrice } = sessionPricing
          if (typeof adultPrice !== 'number' || adultPrice < 0) {
            return NextResponse.json(
              { success: false, error: `sessionSpecificExtraDrinksPricing.${sessionKey}.adultPrice must be a non-negative number` },
              { status: 400 }
            )
          }
          if (typeof childPrice !== 'number' || childPrice < 0) {
            return NextResponse.json(
              { success: false, error: `sessionSpecificExtraDrinksPricing.${sessionKey}.childPrice must be a non-negative number` },
              { status: 400 }
            )
          }
          if (typeof infantPrice !== 'number' || infantPrice < 0) {
            return NextResponse.json(
              { success: false, error: `sessionSpecificExtraDrinksPricing.${sessionKey}.infantPrice must be a non-negative number` },
              { status: 400 }
            )
          }
        }
      }
    }

    const db = await getDatabase()
    const settingsCollection = db.collection(COLLECTIONS.SETTINGS)
    const now = new Date()

    // Check if settings already exist
    const existingSettings = await settingsCollection.findOne({ type: 'buffet' })

    const settingsData: BuffetSettings = {
      sessions: sessions || {
        breakfast: {
          name: 'Breakfast',
          startTime: '07:00',
          endTime: '11:00',
          adultPrice: 20,
          childPrice: 12,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        },
        lunch: {
          name: 'Lunch',
          startTime: '12:00',
          endTime: '16:00',
          adultPrice: 25,
          childPrice: 15,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        },
        dinner: {
          name: 'Dinner',
          startTime: '18:00',
          endTime: '22:00',
          adultPrice: 30,
          childPrice: 18,
          infantPrice: 0,
          isActive: true,
          nextOrderAvailableInMinutes: 30
        }
      },
      extraDrinksPrice: extraDrinksPrice ?? 5, // Keep for backward compatibility
      extraDrinksPricing: extraDrinksPricing ?? {
        adultPrice: extraDrinksPrice ?? 5,
        childPrice: Math.round((extraDrinksPrice ?? 5) * 0.6), // 60% of adult price
        infantPrice: 0
      },
      sessionSpecificExtraDrinksPricing: sessionSpecificExtraDrinksPricing ?? {
        breakfast: {
          adultPrice: 5,
          childPrice: 3,
          infantPrice: 0
        },
        lunch: {
          adultPrice: 5,
          childPrice: 3,
          infantPrice: 0
        },
        dinner: {
          adultPrice: 5,
          childPrice: 3,
          infantPrice: 0
        }
      },
      updatedAt: now
    }

    let result
    if (existingSettings) {
      // Update existing settings
      result = await settingsCollection.updateOne(
        { type: 'buffet' },
        { 
          $set: {
            ...settingsData,
            updatedAt: now
          }
        }
      )
    } else {
      // Create new settings
      result = await settingsCollection.insertOne({
        type: 'buffet',
        ...settingsData,
        createdAt: now
      })
    }

    if (result.acknowledged) {
      return NextResponse.json({
        success: true,
        message: existingSettings ? 'Buffet settings updated successfully' : 'Buffet settings created successfully',
        data: settingsData
      })
    } else {
      throw new Error('Failed to save settings')
    }
  } catch (error) {
    console.error('Error saving buffet settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save buffet settings' },
      { status: 500 }
    )
  }
}

// PUT - Update buffet settings (alias for POST)
export async function PUT(request: NextRequest) {
  return POST(request)
}