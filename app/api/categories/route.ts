import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const session = searchParams.get('session')
    
    const db = await getDatabase()
    let query = {}
    
    // Filter by session if provided
    if (session) {
      const validSessions = ['breakfast', 'lunch', 'dinner']
      if (validSessions.includes(session)) {
        query = { sessions: { $in: [session] } }
      }
    }
    
    const categories = await db.collection(COLLECTIONS.CATEGORIES).find(query).toArray()
    
    // Convert MongoDB _id to id and format response
    const formattedCategories = categories.map(category => ({
      id: category._id.toString(),
      name: category.name,
      description: category.description || '',
      sessions: category.sessions || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedCategories
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description = '', sessions = [] } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Validate sessions array
    if (!Array.isArray(sessions)) {
      return NextResponse.json(
        { success: false, error: 'Sessions must be an array' },
        { status: 400 }
      )
    }

    const validSessions = ['breakfast', 'lunch', 'dinner']
    const invalidSessions = sessions.filter(session => !validSessions.includes(session))
    if (invalidSessions.length > 0) {
      return NextResponse.json(
        { success: false, error: `Invalid sessions: ${invalidSessions.join(', ')}. Valid sessions are: ${validSessions.join(', ')}` },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const categoriesCollection = db.collection(COLLECTIONS.CATEGORIES)

    // Check if category already exists
    const existingCategory = await categoriesCollection.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    })

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    // Create new category
    const newCategory = {
      name: name.trim(),
      description: description.trim(),
      sessions: sessions,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Insert into database
    const result = await categoriesCollection.insertOne(newCategory)

    // Return the created category with formatted id
    const createdCategory = {
      id: result.insertedId.toString(),
      name: newCategory.name,
      description: newCategory.description,
      sessions: newCategory.sessions,
      createdAt: newCategory.createdAt,
      updatedAt: newCategory.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: createdCategory
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    )
  }
}