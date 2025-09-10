"use client"

import { useState } from "react"
import { User, CreateUserRequest, validateUserData, getRoleDisplayName, getStatusDisplayName, MOCK_USERS } from "@/lib/userTypes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function UsersPage() {
  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [newUser, setNewUser] = useState<CreateUserRequest>({ name: '', email: '', role: 'waiter', password: '' })
  const [formErrors, setFormErrors] = useState<string[]>([])

  const handleAddUser = () => {
    const errors = validateUserData(newUser)
    setFormErrors(errors)
    
    if (errors.length === 0) {
      const user: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0]
      }
      setUsers([...users, user])
      setNewUser({ name: '', email: '', role: 'waiter', password: '' })
      setFormErrors([])
      setShowAddUser(false)
    }
  }

  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ))
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        {/* <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage restaurant staff and administrators</CardDescription>
        </CardHeader> */}
        <CardContent>
          <div className="space-y-6">
            {/* Add User Section */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">User Management</h3>
                <p className="text-sm text-gray-600">Manage admin and waiter accounts</p>
              </div>
              <Button onClick={() => setShowAddUser(!showAddUser)}>
                {showAddUser ? 'Cancel' : 'Add New User'}
              </Button>
            </div>

            {/* Add User Form */}
            {showAddUser && (
              <Card className="border-2 border-dashed border-gray-300">
                <CardHeader>
                  <CardTitle className="text-base">Add New Staff Member</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Form Validation Errors */}
                  {formErrors.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-red-500">⚠️</span>
                        <span className="text-sm font-medium text-red-800">Please fix the following errors:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {formErrors.map((error, index) => (
                          <li key={index} className="text-sm text-red-700">{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter full name"
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email address"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Role</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value as 'admin' | 'waiter'})}
                      >
                        <option value="waiter">Waiter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
                    <Button onClick={handleAddUser}>Add User</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-3">Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>
              <div className="divide-y">
                {users.map((user) => (
                  <div key={user.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <p className="text-sm">{user.email}</p>
                        <p className="text-xs text-gray-500">Joined {user.createdAt}</p>
                      </div>
                      <div className="col-span-2">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {getStatusDisplayName(user.status)}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleUserStatus(user.id)}
                          >
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Management Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center space-x-2">
                  <span>🏪</span>
                  <span>Customer Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-blue-800">
                    <strong>Table-Based System:</strong> Customers are automatically managed through table numbers.
                  </p>
                  <p className="text-sm text-blue-700">
                    • Each table session creates a temporary customer record
                  </p>
                  <p className="text-sm text-blue-700">
                    • Customer data is linked to table number and session ID
                  </p>
                  <p className="text-sm text-blue-700">
                    • No separate customer accounts needed - managed via table login system
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}