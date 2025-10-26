"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Plus, Edit, Trash2, Package } from "lucide-react"
import { toast } from "sonner"
import { fetchCategories, createCategory, updateCategory, deleteCategory } from "@/lib/api/categories"
import { menuItems, type MenuCategory } from "@/lib/mockData"
import { withRouteProtection } from "@/components/admin/route-protection"

function CategoriesPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', sessions: [] as string[] })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch categories on component mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await fetchCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = () => {
    setFormData({ name: '', description: '', sessions: [] })
    setShowAddDialog(true)
  }

  const handleEditCategory = (category: MenuCategory) => {
    setSelectedCategory(category)
    setFormData({ 
      name: category.name, 
      description: category.description || '', 
      sessions: category.sessions || [] 
    })
    setShowEditDialog(true)
  }

  const handleDeleteCategory = (category: MenuCategory) => {
    setSelectedCategory(category)
    setShowDeleteDialog(true)
  }

  const handleSubmitAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setIsSubmitting(true)
      const newCategory = await createCategory({
        name: formData.name.trim(),
        description: formData.description.trim(),
        sessions: formData.sessions
      })
      setCategories(prev => [...prev, newCategory])
      setShowAddDialog(false)
      setFormData({ name: '', description: '', sessions: [] })
      toast.success('Category created successfully')
    } catch (error: any) {
      console.error('Error creating category:', error)
      toast.error(error.message || 'Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setIsSubmitting(true)
      const updatedCategory = await updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        sessions: formData.sessions
      })
      setCategories(prev => prev.map(cat => 
        cat.id === selectedCategory.id ? updatedCategory : cat
      ))
      setShowEditDialog(false)
      setSelectedCategory(null)
      setFormData({ name: '', description: '', sessions: [] })
      toast.success('Category updated successfully')
    } catch (error: any) {
      console.error('Error updating category:', error)
      toast.error(error.message || 'Failed to update category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return

    try {
      setIsSubmitting(true)
      await deleteCategory(selectedCategory.id)
      setCategories(prev => prev.filter(cat => cat.id !== selectedCategory.id))
      setShowDeleteDialog(false)
      setSelectedCategory(null)
      toast.success('Category deleted successfully')
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(error.message || 'Failed to delete category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getCategoryItemCount = (categoryId: string) => {
    return menuItems.filter(item => item.categoryId === categoryId).length
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Category Management</CardTitle>
              <CardDescription>Organize your menu items into categories</CardDescription>
            </div>
            <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No categories found</p>
              <Button onClick={handleAddCategory} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create your first category
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => {
                const itemCount = getCategoryItemCount(category.id)
                return (
                  <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{category.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {category.description && (
                        <p className="text-gray-600 text-sm">{category.description}</p>
                      )}
                      {category.sessions && category.sessions.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {category.sessions.map((session) => (
                            <Badge key={session} variant="outline" className="text-xs capitalize">
                              {session}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCategory(category)}
                        className="hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category)}
                        className="hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700"
                        disabled={itemCount > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category to organize your menu items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-name">Category Name *</Label>
              <Input
                id="add-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter category description (optional)"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Available Sessions</Label>
              <div className="mt-2 space-y-2">
                {['breakfast', 'lunch', 'dinner'].map((session) => (
                  <div key={session} className="flex items-center space-x-2">
                    <Checkbox
                      id={`add-session-${session}`}
                      checked={formData.sessions.includes(session)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            sessions: [...prev.sessions, session]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            sessions: prev.sessions.filter(s => s !== session)
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`add-session-${session}`} className="capitalize">
                      {session}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Category Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter category name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter category description (optional)"
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Available Sessions</Label>
              <div className="mt-2 space-y-2">
                {['breakfast', 'lunch', 'dinner'].map((session) => (
                  <div key={session} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-session-${session}`}
                      checked={formData.sessions.includes(session)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            sessions: [...prev.sessions, session]
                          }))
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            sessions: prev.sessions.filter(s => s !== session)
                          }))
                        }
                      }}
                    />
                    <Label htmlFor={`edit-session-${session}`} className="capitalize">
                      {session}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={isSubmitting || !formData.name.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating...' : 'Update Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{selectedCategory?.name}"? This action cannot be undone.
              {selectedCategory && getCategoryItemCount(selectedCategory.id) > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  This category has {getCategoryItemCount(selectedCategory.id)} menu item(s). Please remove all items before deleting the category.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting || (selectedCategory && getCategoryItemCount(selectedCategory.id) > 0)}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Category'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default withRouteProtection(CategoriesPage, {
  requiredPermission: 'categories.view'
})