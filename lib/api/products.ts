// API utility functions for products

export interface Product {
  id: string
  categoryId: string
  name: string
  limitPerOrder: number
  description?: string
  image?: string
  isVegetarian?: boolean
  isSpicy?: boolean
  isAvailable?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateProductData {
  categoryId: string
  name: string
  limitPerOrder: number
  description?: string
  image?: string
  isVegetarian?: boolean
  isSpicy?: boolean
  isAvailable?: boolean
}

export interface UpdateProductData {
  categoryId?: string
  name?: string
  limitPerOrder?: number
  description?: string
  image?: string
  isVegetarian?: boolean
  isSpicy?: boolean
  isAvailable?: boolean
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Fetch all products
export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch('/api/products', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Product[]> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch products')
    }

    return result.data || []
  } catch (error) {
    console.error('Error fetching products:', error)
    throw error
  }
}

// Fetch products by category
export async function fetchProductsByCategory(categoryId: string): Promise<Product[]> {
  try {
    const products = await fetchProducts()
    return products.filter(product => product.categoryId === categoryId)
  } catch (error) {
    console.error('Error fetching products by category:', error)
    throw error
  }
}

// Fetch a single product by ID
export async function fetchProduct(id: string): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Product> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch product')
    }

    if (!result.data) {
      throw new Error('Product not found')
    }

    return result.data
  } catch (error) {
    console.error('Error fetching product:', error)
    throw error
  }
}

// Create a new product
export async function createProduct(productData: CreateProductData): Promise<Product> {
  try {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Product> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create product')
    }

    if (!result.data) {
      throw new Error('No product data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error creating product:', error)
    throw error
  }
}

// Update an existing product
export async function updateProduct(id: string, productData: UpdateProductData): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Product> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to update product')
    }

    if (!result.data) {
      throw new Error('No product data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error updating product:', error)
    throw error
  }
}

// Delete a product
export async function deleteProduct(id: string): Promise<Product> {
  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorResult: ApiResponse<never> = await response.json()
      throw new Error(errorResult.error || `HTTP error! status: ${response.status}`)
    }

    const result: ApiResponse<Product> = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete product')
    }

    if (!result.data) {
      throw new Error('No product data returned')
    }

    return result.data
  } catch (error) {
    console.error('Error deleting product:', error)
    throw error
  }
}