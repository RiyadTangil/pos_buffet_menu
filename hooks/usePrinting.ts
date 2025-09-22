'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { PrintJob, PrinterConfig, CategoryPrinterMapping } from '@/lib/models/printer'
import { 
  fetchPrinters, 
  fetchPrintJobs, 
  fetchCategoryPrinterMappings,
  printOrderByCategories 
} from '@/lib/api/printers'

interface UsePrintingOptions {
  autoRefreshJobs?: boolean
  refreshInterval?: number
}

interface PrintingState {
  printers: PrinterConfig[]
  printJobs: PrintJob[]
  categoryMappings: CategoryPrinterMapping[]
  loading: boolean
  error: string | null
  isPrinting: boolean
}

interface PrintOrderData {
  orderId: string
  orderItems: any[]
  tableNumber?: string | number
  guestCount?: number
  orderTime?: string
}

export function usePrinting(options: UsePrintingOptions = {}) {
  const { autoRefreshJobs = false, refreshInterval = 5000 } = options

  const [state, setState] = useState<PrintingState>({
    printers: [],
    printJobs: [],
    categoryMappings: [],
    loading: true,
    error: null,
    isPrinting: false
  })

  // Load initial data
  useEffect(() => {
    loadAllData()
  }, [])

  // Auto-refresh print jobs if enabled
  useEffect(() => {
    if (autoRefreshJobs) {
      const interval = setInterval(loadPrintJobs, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefreshJobs, refreshInterval])

  const loadAllData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      
      const [printersData, printJobsData, mappingsData] = await Promise.all([
        fetchPrinters(),
        fetchPrintJobs(),
        fetchCategoryPrinterMappings()
      ])

      setState(prev => ({
        ...prev,
        printers: printersData,
        printJobs: printJobsData,
        categoryMappings: mappingsData,
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load printing data'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }))
    }
  }, [])

  const loadPrinters = useCallback(async () => {
    try {
      const printersData = await fetchPrinters()
      setState(prev => ({ ...prev, printers: printersData }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load printers'
      setState(prev => ({ ...prev, error: errorMessage }))
    }
  }, [])

  const loadPrintJobs = useCallback(async (filters?: { orderId?: string; status?: string }) => {
    try {
      const printJobsData = await fetchPrintJobs(filters)
      setState(prev => ({ ...prev, printJobs: printJobsData }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load print jobs'
      setState(prev => ({ ...prev, error: errorMessage }))
    }
  }, [])

  const loadCategoryMappings = useCallback(async () => {
    try {
      const mappingsData = await fetchCategoryPrinterMappings()
      setState(prev => ({ ...prev, categoryMappings: mappingsData }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load category mappings'
      setState(prev => ({ ...prev, error: errorMessage }))
    }
  }, [])

  const printOrder = useCallback(async (orderData: PrintOrderData): Promise<PrintJob[]> => {
    try {
      setState(prev => ({ ...prev, isPrinting: true, error: null }))

      // Validate order data
      if (!orderData.orderId || !orderData.orderItems || orderData.orderItems.length === 0) {
        throw new Error('Invalid order data: Order ID and items are required')
      }

      // Check if printers are configured
      if (state.printers.length === 0) {
        throw new Error('No printers configured. Please set up printers first.')
      }

      // Print the order
      const printJobs = await printOrderByCategories(
        orderData.orderId,
        orderData.orderItems
      )

      if (printJobs.length === 0) {
        throw new Error('No print jobs were created. Please check printer configuration.')
      }

      // Update print jobs in state
      setState(prev => ({
        ...prev,
        printJobs: [...printJobs, ...prev.printJobs],
        isPrinting: false
      }))

      // Show success notification
      toast.success('Order printed successfully!', {
        description: `${printJobs.length} print job(s) created for different departments.`
      })

      return printJobs
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to print order'
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isPrinting: false
      }))
      
      toast.error('Print failed', {
        description: errorMessage
      })
      
      throw error
    }
  }, [state.printers])

  const getPrintersForCategory = useCallback((categoryId: string): PrinterConfig[] => {
    const categoryMappings = state.categoryMappings
      .filter(m => m.categoryId === categoryId && m.isActive)
      .sort((a, b) => (a.priority || 1) - (b.priority || 1))

    const categoryPrinters: PrinterConfig[] = []
    for (const mapping of categoryMappings) {
      const printer = state.printers.find(p => p.id === mapping.printerId && p.isActive)
      if (printer) {
        categoryPrinters.push(printer)
      }
    }

    return categoryPrinters
  }, [state.printers, state.categoryMappings])

  const getActivePrinters = useCallback((): PrinterConfig[] => {
    return state.printers.filter(p => p.isActive)
  }, [state.printers])

  const getPrintJobsForOrder = useCallback((orderId: string): PrintJob[] => {
    return state.printJobs.filter(job => job.orderId === orderId)
  }, [state.printJobs])

  const getPendingPrintJobs = useCallback((): PrintJob[] => {
    return state.printJobs.filter(job => job.status === 'pending')
  }, [state.printJobs])

  const getFailedPrintJobs = useCallback((): PrintJob[] => {
    return state.printJobs.filter(job => job.status === 'failed')
  }, [state.printJobs])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const refresh = useCallback(() => {
    loadAllData()
  }, [loadAllData])

  return {
    // State
    printers: state.printers,
    printJobs: state.printJobs,
    categoryMappings: state.categoryMappings,
    loading: state.loading,
    error: state.error,
    isPrinting: state.isPrinting,

    // Actions
    printOrder,
    loadPrinters,
    loadPrintJobs,
    loadCategoryMappings,
    clearError,
    refresh,

    // Computed values
    getPrintersForCategory,
    getActivePrinters,
    getPrintJobsForOrder,
    getPendingPrintJobs,
    getFailedPrintJobs
  }
}