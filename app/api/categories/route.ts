import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch all categories
export async function GET() {
  try {
    const db = await getDatabase()
    const categories = await db.collection(COLLECTIONS.CATEGORIES).find({}).toArray()
    
    // Convert MongoDB _id to id and format response
    const formattedCategories = categories.map(category => ({
      id: category._id.toString(),
      name: category.name,
      description: category.description || '',
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
    const { name, description = '' } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
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