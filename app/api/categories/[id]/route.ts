import { NextRequest, NextResponse } from 'next/server'
import { getDatabase, COLLECTIONS } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Get a specific category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    
    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const category = await db.collection(COLLECTIONS.CATEGORIES).findOne({
      _id: new ObjectId(id)
    })

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Format response
    const formattedCategory = {
      id: category._id.toString(),
      name: category.name,
      description: category.description || '',
      sessions: category.sessions || [],
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: formattedCategory
    })
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT - Update a specific category
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
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

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const categoriesCollection = db.collection(COLLECTIONS.CATEGORIES)

    // Check if category exists
    const existingCategory = await categoriesCollection.findOne({
      _id: new ObjectId(id)
    })

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if another category with the same name exists (excluding current category)
    const duplicateCategory = await categoriesCollection.findOne({
      _id: { $ne: new ObjectId(id) },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    })

    if (duplicateCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name already exists' },
        { status: 409 }
      )
    }

    // Update category
    const updateData = {
      name: name.trim(),
      description: description.trim(),
      sessions: sessions,
      updatedAt: new Date()
    }

    await categoriesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    // Get updated category
    const updatedCategory = await categoriesCollection.findOne({
      _id: new ObjectId(id)
    })

    // Format response
    const formattedCategory = {
      id: updatedCategory!._id.toString(),
      name: updatedCategory!.name,
      description: updatedCategory!.description || '',
      sessions: updatedCategory!.sessions || [],
      createdAt: updatedCategory!.createdAt,
      updatedAt: updatedCategory!.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: formattedCategory
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a specific category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid category ID format' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const categoriesCollection = db.collection(COLLECTIONS.CATEGORIES)

    // Check if category exists
    const existingCategory = await categoriesCollection.findOne({
      _id: new ObjectId(id)
    })

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if category has associated menu items (if products collection exists)
    try {
      const productsCollection = db.collection(COLLECTIONS.PRODUCTS)
      const hasMenuItems = await productsCollection.findOne({ categoryId: id })
      
      if (hasMenuItems) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete category with associated menu items' },
          { status: 409 }
        )
      }
    } catch (error) {
      // If products collection doesn't exist, continue with deletion
      console.log('Products collection not found, proceeding with category deletion')
    }

    // Delete category
    await categoriesCollection.deleteOne({ _id: new ObjectId(id) })

    // Format deleted category for response
    const deletedCategory = {
      id: existingCategory._id.toString(),
      name: existingCategory.name,
      description: existingCategory.description || '',
      createdAt: existingCategory.createdAt,
      updatedAt: existingCategory.updatedAt
    }

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      data: deletedCategory
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}