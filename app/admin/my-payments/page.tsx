'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, Users, CreditCard, Filter, Search, DollarSign, Edit, MoreHorizontal, Banknote, User } from 'lucide-react';
import { Payment } from '@/lib/models/payment';
import { canUserAccess } from '@/lib/userTypes';
import { useSimpleRBAC } from '@/hooks/use-simple-rbac';

// Fetch tables from API
const fetchTables = async () => {
  try {
    const response = await fetch('/api/tables');
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      console.error('Failed to fetch tables:', data.error);
      return [];
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
    return [];
  }
};

// Fetch waiter's payments from API
const fetchMyPayments = async (filters: {
  startDate?: string;
  endDate?: string;
  sessionType?: string;
  tableId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const params = new URLSearchParams();
    
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sessionType && filters.sessionType !== 'all') {
      params.append('sessionType', filters.sessionType);
    }
    if (filters.tableId && filters.tableId !== 'all') {
      params.append('tableId', filters.tableId);
    }
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    
    const response = await fetch(`/api/my-payments?${params.toString()}`);
    const data = await response.json();
    
    if (data.success) {
      return {
        payments: data.data,
        pagination: data.pagination
      };
    } else {
      console.error('Failed to fetch payments:', data.error);
      return { payments: [], pagination: null };
    }
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { payments: [], pagination: null };
  }
};

export default function MyPaymentsPage() {
  const { data: session, status } = useSession();
  const { hasPermission } = useSimpleRBAC();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEndDate, setSelectedEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedTable, setSelectedTable] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Load data on component mount and when filters change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Load tables
      const tablesData = await fetchTables();
      setTables(tablesData);
      
      // Load payments
      const { payments: paymentsData, pagination: paginationData } = await fetchMyPayments({
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        sessionType: selectedSession,
        tableId: selectedTable,
        status: selectedStatus,
        page: currentPage,
        limit: 20
      });
      
      setPayments(paymentsData);
      setPagination(paginationData);
      setLoading(false);
    };

    if (session?.user) {
      loadData();
    }
  }, [selectedStartDate, selectedEndDate, selectedSession, selectedTable, selectedStatus, currentPage, session]);

  // Calculate total amount for current view
  const totalAmount = payments.reduce((sum, payment) => sum + payment.totalAmount, 0);

  // Format currency
  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;

  // Get status color for cards
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get session color for cards
  const getSessionColor = (session: string) => {
    switch (session) {
      case 'breakfast':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'lunch':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dinner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if user has permission to view this page
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access this page.</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('my-payments.view')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Payments</h1>
          <p className="text-muted-foreground">View and track your payment history</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={selectedStartDate}
                onChange={(e) => setSelectedStartDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={selectedEndDate}
                onChange={(e) => setSelectedEndDate(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="session" className="text-xs text-muted-foreground">Session:</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="table" className="text-xs text-muted-foreground">Table:</Label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="h-8 w-24 text-xs">
                  <SelectValue placeholder="Table" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {tables?.map(table => (
                    <SelectItem key={table.id} value={table.id}>
                      Table {table.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="status" className="text-xs text-muted-foreground">Status:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Cards Grid */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Loading payments...</h3>
              <p className="text-muted-foreground">Please wait while we fetch your payment data.</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-muted-foreground">No payments match your current filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {payments.map((payment) => (
                <Card key={payment.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                  <CardContent className="p-4 space-y-3">
                    {/* Header with Status and Table */}
                    <div className="flex justify-between items-center">
                      <Badge 
                        className={`${getStatusColor(payment.status)} text-white font-medium px-2 py-1 text-xs`}
                      >
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                      <div className="text-lg font-bold text-gray-900">
                        Table {payment.tableNumber || payment.tableId?.toString().slice(-2) || 'N/A'}
                      </div>
                    </div>

                    {/* Amount and Payment Method */}
                    <div className="flex justify-between items-center">
                      <div className="text-xl font-bold text-green-600">
                        €{payment.totalAmount.toFixed(2)}
                      </div>
                      <div className="flex items-center gap-1">
                        {payment.paymentMethod === 'cash' ? (
                          <Banknote className="h-4 w-4 text-green-600" />
                        ) : payment.paymentMethod === 'card' ? (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        ) : (
                          <User className="h-4 w-4 text-gray-600" />
                        )}
                        <span className="text-xs text-gray-600 capitalize font-medium">
                          {payment.paymentMethod || 'Waiter'}
                        </span>
                      </div>
                    </div>

                    {/* Date and Session */}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(payment.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })} {new Date(payment.createdAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${getSessionColor(payment.sessionType)} border-current text-xs px-2 py-0`}
                      >
                        {payment.sessionType.charAt(0).toUpperCase() + payment.sessionType.slice(1)}
                      </Badge>
                    </div>

                    {/* Waiter Info */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 pt-1 border-t border-gray-100">
                      <User className="h-3 w-3" />
                      <span>Waiter {payment.waiterName || 'Unknown'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} payments
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}