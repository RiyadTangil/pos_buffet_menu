"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Edit, Trash2, Search, Leaf, Flame, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { fetchProducts, createProduct, updateProduct, deleteProduct, type Product, type CreateProductData } from "@/lib/api/products"
import { fetchCategories, type Category } from "@/lib/api/categories"

interface ProductFormData {
  categoryId: string
  name: string
  limitPerOrder: string
  price: string
  description: string
  image: string
  isVegetarian: boolean
  isSpicy: boolean
  isAvailable: boolean
}

const initialFormData: ProductFormData = {
  categoryId: '',
  name: '',
  limitPerOrder: '1',
  price: '0',
  description: '',
  image: '',
  isVegetarian: false,
  isSpicy: false,
  isAvailable: true
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Load products and categories
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories()
      ])
      setProducts(productsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId)
    return category?.name || 'Unknown Category'
  }

  // Handle form input changes
  const handleInputChange = (field: keyof ProductFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Validate form data
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return 'Product name is required'
    if (!formData.categoryId) return 'Category is required'
    if (!formData.limitPerOrder || isNaN(Number(formData.limitPerOrder)) || Number(formData.limitPerOrder) < 1) {
      return 'Serving limit must be at least 1'
    }
    return null
  }

  // Handle add product
  const handleAddProduct = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setSubmitting(true)
      const productData: CreateProductData = {
        categoryId: formData.categoryId,
        name: formData.name.trim(),
        limitPerOrder: Number(formData.limitPerOrder),
        price: Number(formData.price) || 0,
        description: formData.description.trim(),
        image: formData.image,
        isVegetarian: formData.isVegetarian,
        isSpicy: formData.isSpicy,
        isAvailable: formData.isAvailable
      }

      const newProduct = await createProduct(productData)
      setProducts(prev => [...prev, newProduct])
      setIsAddDialogOpen(false)
      setFormData(initialFormData)
      toast.success('Product added successfully')
    } catch (error: any) {
      console.error('Error adding product:', error)
      toast.error(error.message || 'Failed to add product')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit product
  const handleEditProduct = async () => {
    if (!editingProduct) return

    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      setSubmitting(true)
      const productData: CreateProductData = {
        categoryId: formData.categoryId,
        name: formData.name.trim(),
        limitPerOrder: Number(formData.limitPerOrder),
        price: Number(formData.price) || 0,
        description: formData.description.trim(),
        image: formData.image,
        isVegetarian: formData.isVegetarian,
        isSpicy: formData.isSpicy,
        isAvailable: formData.isAvailable
      }

      const updatedProduct = await updateProduct(editingProduct.id, productData)
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p))
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      setFormData(initialFormData)
      toast.success('Product updated successfully')
    } catch (error: any) {
      console.error('Error updating product:', error)
      toast.error(error.message || 'Failed to update product')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!deletingProduct) return

    try {
      setSubmitting(true)
      await deleteProduct(deletingProduct.id)
      setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
      setIsDeleteDialogOpen(false)
      setDeletingProduct(null)
      toast.success('Product deleted successfully')
    } catch (error: any) {
      console.error('Error deleting product:', error)
      toast.error(error.message || 'Failed to delete product')
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      categoryId: product.categoryId,
      name: product.name,
      limitPerOrder: product.limitPerOrder.toString(),
      price: (product.price || 0).toString(),
      description: product.description || '',
      image: product.image || '',
      isVegetarian: product.isVegetarian || false,
      isSpicy: product.isSpicy || false,
      isAvailable: product.isAvailable !== false
    })
    setIsEditDialogOpen(true)
  }

  // Open delete dialog
  const openDeleteDialog = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading products...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Items Management</CardTitle>
          <CardDescription>Manage your menu items, prices, and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setFormData(initialFormData)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Create a new menu item for your restaurant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter product name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="image">Product Image URL</Label>
                      <Input
                        id="image"
                        value={formData.image}
                        onChange={(e) => handleInputChange('image', e.target.value)}
                        placeholder="Enter image URL"
                      />
                      {formData.image && (
                        <div className="mt-2">
                          <img 
                            src={formData.image} 
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="limit">Serving Limit</Label>
                      <Input
                        id="limit"
                        type="number"
                        min="1"
                        value={formData.limitPerOrder}
                        onChange={(e) => handleInputChange('limitPerOrder', e.target.value)}
                        placeholder="Maximum servings per guest"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price (Optional)</Label>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="Enter price (0 for free)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Enter product description"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="vegetarian">Vegetarian</Label>
                        <Switch
                          id="vegetarian"
                          checked={formData.isVegetarian}
                          onCheckedChange={(checked) => handleInputChange('isVegetarian', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="spicy">Spicy</Label>
                        <Switch
                          id="spicy"
                          checked={formData.isSpicy}
                          onCheckedChange={(checked) => handleInputChange('isSpicy', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="available">Available</Label>
                        <Switch
                          id="available"
                          checked={formData.isAvailable}
                          onCheckedChange={(checked) => handleInputChange('isAvailable', checked)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct} disabled={submitting}>
                      {submitting ? 'Adding...' : 'Add Product'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        {searchTerm || selectedCategory !== 'all' ? 'No products match your filters' : 'No products found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                       <TableRow key={product.id}>
                         <TableCell>
                           <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                             {product.image ? (
                               <img 
                                 src={product.image} 
                                 alt={product.name}
                                 className="w-full h-full object-cover"
                               />
                             ) : (
                               <div className="text-gray-400 text-xs">No Image</div>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>
                           <div>
                             <div className="font-medium">{product.name}</div>
                             {product.description && (
                               <div className="text-sm text-gray-500 truncate max-w-xs">
                                 {product.description}
                               </div>
                             )}
                           </div>
                         </TableCell>
                         <TableCell>{getCategoryName(product.categoryId)}</TableCell>
                         <TableCell>{product.limitPerOrder}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {product.isVegetarian && (
                              <Badge variant="secondary" className="text-xs">
                                <Leaf className="h-3 w-3 mr-1" />
                                Veg
                              </Badge>
                            )}
                            {product.isSpicy && (
                              <Badge variant="destructive" className="text-xs">
                                <Flame className="h-3 w-3 mr-1" />
                                Spicy
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.isAvailable !== false ? "default" : "secondary"}>
                            {product.isAvailable !== false ? (
                              <><Eye className="h-3 w-3 mr-1" />Available</>
                            ) : (
                              <><EyeOff className="h-3 w-3 mr-1" />Unavailable</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(product)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Stats */}
            <div className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label htmlFor="edit-image">Product Image URL</Label>
              <Input
                id="edit-image"
                value={formData.image}
                onChange={(e) => handleInputChange('image', e.target.value)}
                placeholder="Enter image URL"
              />
              {formData.image && (
                <div className="mt-2">
                  <img 
                    src={formData.image} 
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select value={formData.categoryId} onValueChange={(value) => handleInputChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-limit">Serving Limit</Label>
              <Input
                id="edit-limit"
                type="number"
                min="1"
                value={formData.limitPerOrder}
                onChange={(e) => handleInputChange('limitPerOrder', e.target.value)}
                placeholder="Maximum servings per guest"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price (Optional)</Label>
              <Input
                id="edit-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="Enter price (0 for free)"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-vegetarian">Vegetarian</Label>
                <Switch
                  id="edit-vegetarian"
                  checked={formData.isVegetarian}
                  onCheckedChange={(checked) => handleInputChange('isVegetarian', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-spicy">Spicy</Label>
                <Switch
                  id="edit-spicy"
                  checked={formData.isSpicy}
                  onCheckedChange={(checked) => handleInputChange('isSpicy', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-available">Available</Label>
                <Switch
                  id="edit-available"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) => handleInputChange('isAvailable', checked)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct} disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}