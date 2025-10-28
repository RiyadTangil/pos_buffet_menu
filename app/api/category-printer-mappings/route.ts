import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { CategoryPrinterMapping } from '@/lib/models/printer'

// File path for storing category-printer mappings
const mappingsFilePath = path.join(process.cwd(), 'data', 'category-printer-mappings.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load mappings from file
function loadMappings(): CategoryPrinterMapping[] {
  try {
    ensureDataDirectory()
    if (fs.existsSync(mappingsFilePath)) {
      const data = fs.readFileSync(mappingsFilePath, 'utf8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Error loading category-printer mappings:', error)
    return []
  }
}

// Save mappings to file
function saveMappings(mappings: CategoryPrinterMapping[]) {
  try {
    ensureDataDirectory()
    fs.writeFileSync(mappingsFilePath, JSON.stringify(mappings, null, 2))
  } catch (error) {
    console.error('Error saving category-printer mappings:', error)
    throw error
  }
}

// Generate unique ID
function generateId(): string {
  return `mapping-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// GET - Fetch all category-printer mappings
export async function GET(request: NextRequest) {
  try {
    const mappings = loadMappings()
    
    return NextResponse.json({
      success: true,
      data: mappings
    })
  } catch (error) {
    console.error('Error fetching category-printer mappings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category-printer mappings' },
      { status: 500 }
    )
  }
}

// POST - Create new category-printer mapping
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { categoryId, printerId, priority } = body

    // Validation
    if (!categoryId || !printerId) {
      return NextResponse.json(
        { success: false, error: 'Category ID and Printer ID are required' },
        { status: 400 }
      )
    }

    const mappings = loadMappings()
    
    // Check if mapping already exists
    const existingMapping = mappings.find(m => 
      m.categoryId === categoryId && m.printerId === printerId
    )
    if (existingMapping) {
      return NextResponse.json(
        { success: false, error: 'Mapping between this category and printer already exists' },
        { status: 400 }
      )
    }

    const newMapping: CategoryPrinterMapping = {
      id: generateId(),
      categoryId,
      printerId,
      priority: priority || 1,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    mappings.push(newMapping)
    saveMappings(mappings)

    return NextResponse.json({
      success: true,
      data: newMapping,
      message: 'Category-printer mapping created successfully'
    })
  } catch (error) {
    console.error('Error creating category-printer mapping:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create category-printer mapping' },
      { status: 500 }
    )
  }
}

// PUT - Update mappings (bulk update)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { mappings: newMappings } = body

    if (!Array.isArray(newMappings)) {
      return NextResponse.json(
        { success: false, error: 'Mappings must be an array' },
        { status: 400 }
      )
    }

    // Validate each mapping
    for (const mapping of newMappings) {
      if (!mapping.categoryId || !mapping.printerId) {
        return NextResponse.json(
          { success: false, error: 'Each mapping must have categoryId and printerId' },
          { status: 400 }
        )
      }
    }

    const currentMappings = loadMappings()
    const updatedMappings: CategoryPrinterMapping[] = []

    // Process new mappings
    for (const mapping of newMappings) {
      const existingMapping = currentMappings.find(m => 
        m.categoryId === mapping.categoryId && m.printerId === mapping.printerId
      )

      if (existingMapping) {
        // Update existing mapping
        updatedMappings.push({
          ...existingMapping,
          priority: mapping.priority || existingMapping.priority,
          isActive: mapping.isActive !== undefined ? mapping.isActive : existingMapping.isActive,
          updatedAt: new Date().toISOString()
        })
      } else {
        // Create new mapping
        updatedMappings.push({
          id: generateId(),
          categoryId: mapping.categoryId,
          printerId: mapping.printerId,
          priority: mapping.priority || 1,
          isActive: mapping.isActive !== undefined ? mapping.isActive : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    }

    saveMappings(updatedMappings)

    return NextResponse.json({
      success: true,
      data: updatedMappings,
      message: 'Category-printer mappings updated successfully'
    })
  } catch (error) {
    console.error('Error updating category-printer mappings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update category-printer mappings' },
      { status: 500 }
    )
  }
}