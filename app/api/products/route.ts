import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

interface CreateProductData {
  categoryId: string
  name: string
  limitPerOrder: number
  description?: string
  image?: string
  isVegetarian?: boolean
  isSpicy?: boolean
  isAvailable?: boolean
}

// GET - Fetch all products
export async function GET() {
  try {
    const db = await getDatabase()
    const products = await db.collection('products').find({}).toArray()
    
    // Convert MongoDB _id to id and format response
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      categoryId: product.categoryId,
      name: product.name,
      limitPerOrder: product.limitPerOrder,
      description: product.description || '',
      image: product.image || '',
      isVegetarian: product.isVegetarian || false,
      isSpicy: product.isSpicy || false,
      isAvailable: product.isAvailable !== false, // Default to true
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: formattedProducts
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      categoryId, 
      name, 
      limitPerOrder = 1, 
      description = '', 
      image = '',
      isVegetarian = false, 
      isSpicy = false,
      isAvailable = true
    } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product name is required' },
        { status: 400 }
      )
    }

    if (!categoryId || typeof categoryId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      )
    }



    if (typeof limitPerOrder !== 'number' || limitPerOrder < 1) {
      return NextResponse.json(
        { success: false, error: 'Serving limit must be at least 1' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Check if category exists
    const categoryExists = await db.collection('categories').findOne({ _id: new ObjectId(categoryId) })
    if (!categoryExists) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 400 }
      )
    }

    // Check if product with same name already exists
    const existingProduct = await db.collection('products').findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    })
    
    if (existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product with this name already exists' },
        { status: 409 }
      )
    }

    // Create new product
    const newProduct = {
      categoryId,
      name: name.trim(),
      limitPerOrder: Number(limitPerOrder),
      description: description.trim(),
      image: image || '',
      isVegetarian: Boolean(isVegetarian),
      isSpicy: Boolean(isSpicy),
      isAvailable: Boolean(isAvailable),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const result = await db.collection('products').insertOne(newProduct)

    const formattedProduct = {
      id: result.insertedId.toString(),
      ...newProduct
    }

    return NextResponse.json({
      success: true,
      data: formattedProduct,
      message: 'Product created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    )
  }
}