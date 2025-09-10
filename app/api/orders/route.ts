import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  categoryId: string
}

interface OrderData {
  orderId: string
  timestamp: string
  items: OrderItem[]
  totalItems: number
  totalAmount: number
  sessionInfo?: {
    adultPrice: number
    childPrice: number
    extraDrinksPrice: number
    nextOrderTiming: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const orderData: OrderData = await request.json()
    
    // Create order directory if it doesn't exist
    const orderDir = join(process.cwd(), 'order')
    if (!existsSync(orderDir)) {
      await mkdir(orderDir, { recursive: true })
    }
    
    // Generate filename with timestamp
    const filename = `order_${orderData.orderId}_${Date.now()}.json`
    const filepath = join(orderDir, filename)
    
    // Write order data to JSON file
    await writeFile(filepath, JSON.stringify(orderData, null, 2), 'utf8')
    
    return NextResponse.json({
      success: true,
      message: 'Order saved successfully',
      filename,
      filepath
    })
  } catch (error) {
    console.error('Error saving order:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save order',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}