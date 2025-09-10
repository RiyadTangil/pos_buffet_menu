"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tables, type Table } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
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
  const [tableStates, setTableStates] = useState<Table[]>(tables);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    includeDrinks: false,
  });

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

  const handleConfirm = () => {
    if (selectedTable) {
      setTableStates((prev) =>
        prev.map((table) =>
          table.id === selectedTable.id
            ? { ...table, status: "selected" as const }
            : table
        )
      );

      // Store guest counts in localStorage for the items page
      localStorage.setItem("guestCounts", JSON.stringify(guestCounts));
      localStorage.setItem("selectedTableId", selectedTable.id);

      setIsModalOpen(false);
      router.push("/menu/items");
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
            {tableStates.slice(0, 12).map((table, index) => {
              const tableNumber = index + 1;
              return (
                <div key={table.id}>
                  <div
                    onClick={() => handleTableClick(table)}
                    // disabled={table.status !== "available"}
                    className={`
                    bg-white text-[#4d4d4d] w-full h-20 sm:h-24 text-base sm:text-lg rounded-xl mb-2 p-2 sm:p-3 
                    flex flex-col justify-between transition-transform duration-200 ease-in-out
                    hover:shadow-md
                    `}
                    //     ${getStatusColor(table.status)}
                    // ${table.status === "available" ? "transform hover:scale-105 active:scale-95" : ""}
                  >
                    <div className="text-base sm:text-lg font-bold">Table {tableNumber}</div>
                    <div className="text-xs sm:text-sm text-gray-500">
                      {table.status === "available"
                        ? ""
                        : `Served / ${
                            table.status === "occupied" ? "1" : "0"
                          } Items`}
                    </div>
                  </div>
                </div>
              );
            })}
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
