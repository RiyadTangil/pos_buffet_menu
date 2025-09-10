"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchTables, updateTableStatus, updateTableGuests, type Table } from "@/lib/api/tables";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  includeDrinks: boolean;
}

export default function TablesPage() {
  const router = useRouter();
  const [tableStates, setTableStates] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    includeDrinks: false,
  });

  // Fetch tables data on component mount
  useEffect(() => {
    const loadTables = async () => {
      try {
        setIsLoading(true);
        const tablesData = await fetchTables();
        setTableStates(tablesData);
      } catch (error) {
        console.error('Failed to fetch tables:', error);
        toast.error('Failed to load tables. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTables();
  }, []);

  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available":
        return "bg-green-500 hover:bg-green-600 text-white";
      case "occupied":
        return "bg-red-500 text-white cursor-not-allowed";
      case "cleaning":
        return "bg-yellow-500 text-white cursor-not-allowed";
      case "selected":
        return "bg-blue-500 text-white cursor-not-allowed";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const handleTableClick = (table: Table) => {
    if (table.status === "available") {
      setSelectedTable(table);
      setIsModalOpen(true);
    }
  };

  const handleConfirm = async () => {
    if (selectedTable) {
      try {
        const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;
        
        // Update table status to selected and set guest count
        await updateTableStatus(selectedTable.id, "selected");
        await updateTableGuests(selectedTable.id, totalGuests);

        // Update local state
        setTableStates((prev) =>
          prev.map((table) =>
            table.id === selectedTable.id
              ? { ...table, status: "selected" as const, currentGuests: totalGuests }
              : table
          )
        );

        // Store guest counts in localStorage for the items page
        localStorage.setItem("guestCounts", JSON.stringify(guestCounts));
        localStorage.setItem("selectedTableId", selectedTable.id);

        setIsModalOpen(false);
        toast.success(`Table ${selectedTable.number} selected successfully!`);
        router.push("/menu/items");
      } catch (error) {
        console.error('Failed to select table:', error);
        toast.error('Failed to select table. Please try again.');
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTable(null);
    setGuestCounts({
      adults: 1,
      children: 0,
      infants: 0,
      includeDrinks: false,
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] relative">
      {/* Top Left KALA Logo */}
      <div className="mb-5 bg-white pb-4">
        <img
          src="/images/logo.png"
          alt="KALA Systems Logo"
          className="h-20 w-auto ms-5"
        />
      </div>

      {/* Top Right Cart Icon */}
      {/* <div className="absolute top-6 right-6 z-10">
        <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium">
          Items in Cart (1)
        </div>
      </div> */}

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center   px-4">
        <div className="w-full ">
          {/* Table Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 mb-16">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="bg-white w-full h-20 sm:h-24 rounded-xl mb-2 p-2 sm:p-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))
            ) : (
              tableStates.map((table) => {
                const isAvailable = table.status === "available";
                return (
                  <div key={table.id}>
                    <div
                      onClick={() => handleTableClick(table)}
                      className={`
                        w-full h-20 sm:h-24 text-base sm:text-lg rounded-xl mb-2 p-2 sm:p-3 
                        flex flex-col justify-between transition-transform duration-200 ease-in-out
                        cursor-pointer
                        ${
                          isAvailable
                            ? "bg-white text-[#4d4d4d] hover:shadow-md transform hover:scale-105 active:scale-95"
                            : "bg-gray-100 text-gray-500 cursor-not-allowed"
                        }
                      `}
                    >
                      <div className="text-base sm:text-lg font-bold">Table {table.number}</div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        {isAvailable
                          ? `Capacity: ${table.capacity}`
                          : `${table.status.charAt(0).toUpperCase() + table.status.slice(1)} - ${table.currentGuests}/${table.capacity} guests`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Left - Developed By */}
      <div className="absolute bottom-6 left-6">
        <div className="text-gray-600 text-sm">Developed By</div>
      </div>

      {/* Bottom Right KALA Logo */}
      <div className="absolute bottom-6 right-6">
        <img
          src="/images/logo.png"
          alt="KALA Systems Logo"
          className="h-20 w-auto"
        />
      </div>

      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Table {selectedTable?.number} - Guest Information
            </DialogTitle>
            <DialogDescription>
              Please specify the number of guests for your dining experience.
            </DialogDescription>
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
  );
}
