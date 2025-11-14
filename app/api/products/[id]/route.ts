import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// GET - Fetch a single product by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    const product = await db.collection('products').findOne({ _id: new ObjectId(id) })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    const formattedProduct = {
      id: product._id.toString(),
      categoryId: product.categoryId,
      name: product.name,
      limitPerOrder: product.limitPerOrder,
      price: product.price || 0,
      description: product.description || '',
      image: product.image || '',
      isVegetarian: product.isVegetarian || false,
      isSpicy: product.isSpicy || false,
      isAvailable: product.isAvailable !== false,
      isPremium: product.isPremium || false,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: formattedProduct
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT - Update a product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { 
      categoryId, 
      name, 
      limitPerOrder, 
      price,
      description, 
      image,
      isVegetarian, 
      isSpicy,
      isAvailable,
      isPremium
    } = body

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

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
    
    // Check if product exists
    const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(id) })
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if category exists
    const categoryExists = await db.collection('categories').findOne({ _id: new ObjectId(categoryId) })
    if (!categoryExists) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 400 }
      )
    }

    // Check if another product with same name exists (excluding current product)
    const duplicateProduct = await db.collection('products').findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: new ObjectId(id) }
    })
    
    if (duplicateProduct) {
      return NextResponse.json(
        { success: false, error: 'Another product with this name already exists' },
        { status: 409 }
      )
    }

    // Update product
    const updateData = {
      categoryId,
      name: name.trim(),
      limitPerOrder: Number(limitPerOrder),
      price: Number(price) || 0,
      description: (description || '').trim(),
      image: image || '',
      isVegetarian: Boolean(isVegetarian),
      isSpicy: Boolean(isSpicy),
      isAvailable: Boolean(isAvailable),
      isPremium: Boolean(isPremium),
      updatedAt: new Date().toISOString()
    }

    await db.collection('products').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    // If image changed or cleared, and previous image was a local upload, remove the old file
    const previousImage: string = existingProduct.image || ''
    const newImage: string = updateData.image || ''
    const isLocalProductImage = (url: string) => url.startsWith('/images/products/')

    if (previousImage && previousImage !== newImage && isLocalProductImage(previousImage)) {
      // Ensure no other products reference the same image
      const othersUsing = await db.collection('products').countDocuments({
        image: previousImage,
        _id: { $ne: new ObjectId(id) }
      })

      if (othersUsing === 0) {
        const relative = previousImage.replace('/images/products/', '')
        // Prevent path traversal by rejecting suspicious segments
        if (!relative.includes('..')) {
          const filePath = join(process.cwd(), 'public', 'images', 'products', relative)
          try {
            if (existsSync(filePath)) {
              await unlink(filePath)
            }
          } catch (e) {
            console.warn('Failed to remove old product image:', e)
          }
        }
      }
    }

    const updatedProduct = {
      id,
      ...updateData,
      createdAt: existingProduct.createdAt
    }

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    })

  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID' },
        { status: 400 }
      )
    }

    const db = await getDatabase()
    
    // Check if product exists
    const existingProduct = await db.collection('products').findOne({ _id: new ObjectId(id) })
    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if product is used in any orders (optional - you might want to keep this check)
    try {
      const ordersCollection = db.collection('orders')
      const productInOrders = await ordersCollection.findOne({ 
        'items.menuItemId': id 
      })
      
      if (productInOrders) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete product that has been ordered' },
          { status: 409 }
        )
      }
    } catch (error) {
      // If orders collection doesn't exist, continue with deletion
      console.log('Orders collection not found, proceeding with product deletion')
    }

    // Delete the product
    await db.collection('products').deleteOne({ _id: new ObjectId(id) })

    // If product had a local image, and no other products reference it, remove the file
    const imageToDelete: string = existingProduct.image || ''
    const isLocalProductImage = (url: string) => url.startsWith('/images/products/')
    if (imageToDelete && isLocalProductImage(imageToDelete)) {
      const othersUsing = await db.collection('products').countDocuments({
        image: imageToDelete,
        _id: { $ne: new ObjectId(id) }
      })

      if (othersUsing === 0) {
        const relative = imageToDelete.replace('/images/products/', '')
        if (!relative.includes('..')) {
          const filePath = join(process.cwd(), 'public', 'images', 'products', relative)
          try {
            if (existsSync(filePath)) {
              await unlink(filePath)
            }
          } catch (e) {
            console.warn('Failed to remove product image on delete:', e)
          }
        }
      }
    }

    const deletedProduct = {
      id: existingProduct._id.toString(),
      categoryId: existingProduct.categoryId,
      name: existingProduct.name,
      limitPerOrder: existingProduct.limitPerOrder,
      description: existingProduct.description || '',
      image: existingProduct.image || '',
      isVegetarian: existingProduct.isVegetarian || false,
      isSpicy: existingProduct.isSpicy || false,
      isAvailable: existingProduct.isAvailable !== false,
      isPremium: existingProduct.isPremium || false,
      createdAt: existingProduct.createdAt,
      updatedAt: existingProduct.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: deletedProduct,
      message: 'Product deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}