"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { tables, type Table } from "@/lib/mockData"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface GuestCounts {
  adults: number
  children: number
  infants: number
  includeDrinks: boolean
}

export default function TablesPage() {
  const router = useRouter()
  const [tableStates, setTableStates] = useState<Table[]>(tables)
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    includeDrinks: false,
  })

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-500 hover:bg-green-600 text-white"
      case "occupied":
        return "bg-red-500 text-white cursor-not-allowed"
      case "cleaning":
        return "bg-yellow-500 text-white cursor-not-allowed"
      case "selected":
        return "bg-blue-500 text-white cursor-not-allowed"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const handleTableClick = (table: Table) => {
    if (table.status === "available") {
      setSelectedTable(table)
      setIsModalOpen(true)
    }
  }

  const handleConfirm = () => {
    if (selectedTable) {
      setTableStates((prev) =>
        prev.map((table) => (table.id === selectedTable.id ? { ...table, status: "selected" as const } : table)),
      )

      // Store guest counts in localStorage for the items page
      localStorage.setItem("guestCounts", JSON.stringify(guestCounts))
      localStorage.setItem("selectedTableId", selectedTable.id)

      setIsModalOpen(false)
      router.push("/items")
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedTable(null)
    setGuestCounts({
      adults: 1,
      children: 0,
      infants: 0,
      includeDrinks: false,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Select a Table</h1>
          <p className="text-gray-600">Choose an available table to start your dining experience</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {tableStates.map((table) => (
            <Button
              key={table.id}
              onClick={() => handleTableClick(table)}
              disabled={table.status !== "available"}
              className={`
                h-24 text-lg font-semibold rounded-lg transition-all duration-200
                ${getStatusColor(table.status)}
                ${table.status === "available" ? "transform hover:scale-105 active:scale-95" : ""}
              `}
            >
              <div className="text-center">
                <div className="text-2xl font-bold">Table {table.number}</div>
                <div className="text-sm capitalize opacity-90">{table.status}</div>
              </div>
            </Button>
          ))}
        </div>

        {/* Status Legend */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Table Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span className="text-sm">Cleaning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">Selected</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Table {selectedTable?.number} - Guest Information</DialogTitle>
            <DialogDescription>Please specify the number of guests for your dining experience.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adults">Adults</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="8"
                value={guestCounts.adults}
                onChange={(e) =>
                  setGuestCounts((prev) => ({
                    ...prev,
                    adults: Math.max(1, Number.parseInt(e.target.value) || 1),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="children">Children (3-12 years)</Label>
              <Input
                id="children"
                type="number"
                min="0"
                max="6"
                value={guestCounts.children}
                onChange={(e) =>
                  setGuestCounts((prev) => ({
                    ...prev,
                    children: Math.max(0, Number.parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="infants">Infants (under 3 years)</Label>
              <Input
                id="infants"
                type="number"
                min="0"
                max="4"
                value={guestCounts.infants}
                onChange={(e) =>
                  setGuestCounts((prev) => ({
                    ...prev,
                    infants: Math.max(0, Number.parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="drinks"
                checked={guestCounts.includeDrinks}
                onCheckedChange={(checked) =>
                  setGuestCounts((prev) => ({
                    ...prev,
                    includeDrinks: checked as boolean,
                  }))
                }
              />
              <Label
                htmlFor="drinks"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include drinks package
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
