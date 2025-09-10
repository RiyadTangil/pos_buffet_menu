import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// Interface for buffet settings
interface BuffetSettings {
  _id?: ObjectId
  sessionPrice: number
  sessionAmount: number
  sessionAdultPrice: number
  sessionChildPrice: number
  extraDrinksPrice: number
  nextOrderAvailableInMinutes: number
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
        sessionPrice: 0,
        sessionAmount: 0,
        sessionAdultPrice: 25,
        sessionChildPrice: 15,
        extraDrinksPrice: 5,
        nextOrderAvailableInMinutes: 30
      }
      
      return NextResponse.json({
        success: true,
        data: defaultSettings
      })
    }

    // Format response
    const formattedSettings = {
      id: settings._id.toString(),
      sessionPrice: settings.sessionPrice || 0,
      sessionAmount: settings.sessionAmount || 0,
      sessionAdultPrice: settings.sessionAdultPrice || 25,
      sessionChildPrice: settings.sessionChildPrice || 15,
      extraDrinksPrice: settings.extraDrinksPrice || 5,
      nextOrderAvailableInMinutes: settings.nextOrderAvailableInMinutes || 30,
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
    const {
      sessionPrice,
      sessionAmount,
      sessionAdultPrice,
      sessionChildPrice,
      extraDrinksPrice,
      nextOrderAvailableInMinutes
    } = body

    // Validation
    const numericFields = {
      sessionPrice,
      sessionAmount,
      sessionAdultPrice,
      sessionChildPrice,
      extraDrinksPrice,
      nextOrderAvailableInMinutes
    }

    for (const [field, value] of Object.entries(numericFields)) {
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        return NextResponse.json(
          { success: false, error: `${field} must be a non-negative number` },
          { status: 400 }
        )
      }
    }

    const db = await getDatabase()
    const settingsCollection = db.collection(COLLECTIONS.SETTINGS)
    const now = new Date()

    // Check if settings already exist
    const existingSettings = await settingsCollection.findOne({ type: 'buffet' })

    const settingsData: BuffetSettings = {
      sessionPrice: sessionPrice ?? 0,
      sessionAmount: sessionAmount ?? 0,
      sessionAdultPrice: sessionAdultPrice ?? 25,
      sessionChildPrice: sessionChildPrice ?? 15,
      extraDrinksPrice: extraDrinksPrice ?? 5,
      nextOrderAvailableInMinutes: nextOrderAvailableInMinutes ?? 30,
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