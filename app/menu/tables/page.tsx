"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchTables, updateTableStatus, updateTableGuests, type Table } from "@/lib/api/tables";
import { getBuffetSettings, type BuffetSettings } from "@/lib/api/settings";
import { 
  getTableSession, 
  createOrJoinTableSession, 
  generateDeviceId,
  type TableSession 
} from "@/lib/api/table-sessions";
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
import { Progress } from "@/components/ui/progress";
import { WaiterVerificationModal } from "@/components/ui/waiter-verification-modal";
import { Users, Shield } from "lucide-react";

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  includeDrinks: boolean;
}

interface TableWithSession extends Table {
  session?: TableSession;
  availableAdultCapacity?: number;
}

export default function TablesPage() {
  const router = useRouter();
  const [tableStates, setTableStates] = useState<TableWithSession[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [buffetSettings, setBuffetSettings] = useState<BuffetSettings | null>(null);
  const [deviceId] = useState(() => generateDeviceId());
  const [isSecondaryDevice, setIsSecondaryDevice] = useState(false);
  const [verifiedWaiter, setVerifiedWaiter] = useState<{ name: string; role: string } | null>(null);
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    includeDrinks: false,
  });

  // Fetch tables and settings data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [tablesData, settingsData] = await Promise.all([
          fetchTables(),
          getBuffetSettings()
        ]);
        
        // Enhance tables with session information
        const tablesWithSessions = await Promise.all(
          tablesData.map(async (table) => {
            try {
              const session = await getTableSession(table.id);
              const availableAdultCapacity = session 
                ? Math.max(0, table.capacity - session.guestCounts.adults)
                : table.capacity;
              
              return {
                ...table,
                session,
                availableAdultCapacity
              };
            } catch (error) {
              console.error(`Error fetching session for table ${table.id}:`, error);
              return {
                ...table,
                session: undefined,
                availableAdultCapacity: table.capacity
              };
            }
          })
        );
        
        setTableStates(tablesWithSessions);
        setBuffetSettings(settingsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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

  // Get current session based on time
  const getCurrentSession = () => {
    if (!buffetSettings || !buffetSettings.sessions) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    const sessions = [
      { key: 'breakfast', data: buffetSettings.sessions.breakfast },
      { key: 'lunch', data: buffetSettings.sessions.lunch },
      { key: 'dinner', data: buffetSettings.sessions.dinner }
    ];
    
    for (const session of sessions) {
      if (!session.data.isActive) continue;
      
      const [startHour, startMin] = session.data.startTime.split(':').map(Number);
      const [endHour, endMin] = session.data.endTime.split(':').map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
        return session;
      }
    }
    
    return null;
  };

  const currentSession = getCurrentSession();

  const getTableStatus = (table: TableWithSession) => {
    if (table.status === "available" && !table.session) {
      return "Available";
    } else if (table.session) {
      if (table.availableAdultCapacity! > 0) {
        return `Occupied (${table.availableAdultCapacity} adult spots left)`;
      } else {
        return "Full";
      }
    } else if (table.status === "selected") {
      return "Selected";
    } else if (table.status === "occupied") {
      return "Occupied";
    }
    return "Unavailable";
  };

  const isTableClickable = (table: TableWithSession) => {
    return table.status === "available" || (table.session && table.availableAdultCapacity! > 0);
  };

  const handleTableClick = (table: TableWithSession) => {
    // Check if table is available or has available adult capacity
    if (table.status === "available" || (table.session && table.availableAdultCapacity! > 0)) {
      setSelectedTable(table);
      
      // Determine if this is a secondary device joining an existing session
      if (table.session) {
        setIsSecondaryDevice(true);
        setIsWaiterModalOpen(true);
      } else {
        setIsSecondaryDevice(false);
        setIsModalOpen(true);
      }
    }
  };

  const handleWaiterVerified = (waiterInfo: { name: string; role: string }) => {
    setVerifiedWaiter(waiterInfo);
    setIsWaiterModalOpen(false);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (selectedTable) {
      try {
        // Create or join table session using the new API
        const sessionData = await createOrJoinTableSession({
          tableId: selectedTable.id,
          deviceId,
          guestCounts,
          waiterPin: verifiedWaiter ? '1234' : undefined, // In production, store actual PIN
          isSecondaryDevice
        });

        // Store session data in localStorage for backward compatibility
        localStorage.setItem("guestCounts", JSON.stringify(guestCounts));
        localStorage.setItem("selectedTableId", selectedTable.id);
        localStorage.setItem("tableSession", JSON.stringify(sessionData));
        localStorage.setItem("deviceId", deviceId);

        setIsModalOpen(false);
        toast.success(
          isSecondaryDevice 
            ? `Successfully joined Table ${selectedTable.number}!`
            : `Table ${selectedTable.number} selected successfully!`
        );
        router.push("/menu/items");
      } catch (error) {
        console.error('Failed to select/join table:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to select table. Please try again.');
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
                const getTableColors = (status: string) => {
                  switch (status) {
                    case 'available':
                      return 'bg-green-100 border-2 border-green-300 text-green-800 hover:bg-green-200';
                    case 'occupied':
                      return 'bg-red-100 border-2 border-red-300 text-red-800';
                    case 'cleaning':
                      return 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800';
                    case 'selected':
                      return 'bg-blue-100 border-2 border-blue-300 text-blue-800';
                    default:
                      return 'bg-gray-100 border-2 border-gray-300 text-gray-500';
                  }
                };
                
                return (
                  <div key={table.id}>
                    <div
                      onClick={() => isTableClickable(table) && handleTableClick(table)}
                      className={`
                        w-full h-20 sm:h-24 text-base sm:text-lg rounded-xl mb-2 p-2 sm:p-3 
                        flex flex-col justify-between transition-all duration-200 ease-in-out
                        ${
                          isTableClickable(table)
                            ? "cursor-pointer hover:shadow-md transform hover:scale-105 active:scale-95"
                            : "cursor-not-allowed"
                        }
                        ${getTableColors(table.status)}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-base sm:text-lg font-bold">Table {table.number}</div>
                        {table.session && (
                          <div className="flex items-center text-xs text-blue-600">
                            <Users className="w-3 h-3 mr-1" />
                            <span>{table.session.guestCounts.adults + table.session.guestCounts.children + table.session.guestCounts.infants}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm opacity-75">
                        {getTableStatus(table)}
                      </div>
                      {table.session && verifiedWaiter && (
                        <div className="flex items-center text-xs text-blue-600">
                          <Shield className="w-2 h-2 mr-1" />
                          <span>Waiter: {verifiedWaiter.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Color Legend Disclaimer */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md p-4 border">
        <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Table Status Colors</h3>
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
            <span className="text-green-800 font-medium">Available</span>
          </div>
          {/* <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-red-800 font-medium">Occupied</span>
          </div> */}
          {/* <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
            <span className="text-yellow-800 font-medium">Cleaning</span>
          </div> */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className="text-blue-800 font-medium">Selected</span>
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
              {isSecondaryDevice ? 'Join Table' : 'Table'} {selectedTable?.number} - Guest Information
            </DialogTitle>
            <DialogDescription>
              {isSecondaryDevice 
                ? `Add additional guests to this table. Available adult capacity: ${selectedTable?.availableAdultCapacity}`
                : 'Please specify the number of guests for your dining experience.'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Session Pricing */}
          {buffetSettings && buffetSettings.sessions && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              {currentSession ? (
                <>
                  <h3 className="font-semibold text-blue-900 capitalize mb-2">
                    Current: {currentSession.key} Session ({currentSession.data.startTime} - {currentSession.data.endTime})
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-900">Adult</div>
                      <div className="text-blue-700">£{currentSession.data.adultPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-900">Child</div>
                      <div className="text-blue-700">£{currentSession.data.childPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-900">Infant</div>
                      <div className="text-blue-700">£{currentSession.data.infantPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-900">Extra Drinks</div>
                      <div className="text-blue-700 text-xs space-y-1">
                        <div>Adult: £{(buffetSettings.sessionSpecificExtraDrinksPricing?.[currentSession?.type]?.adultPrice || buffetSettings.extraDrinksPricing?.adultPrice || buffetSettings.extraDrinksPrice)?.toFixed(2)}</div>
                        <div>Child: £{(buffetSettings.sessionSpecificExtraDrinksPricing?.[currentSession?.type]?.childPrice || buffetSettings.extraDrinksPricing?.childPrice || (buffetSettings.extraDrinksPrice * 0.6))?.toFixed(2)}</div>
                        <div>Infant: £{(buffetSettings.sessionSpecificExtraDrinksPricing?.[currentSession?.type]?.infantPrice || buffetSettings.extraDrinksPricing?.infantPrice || 0)?.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-blue-900 mb-3">Session Pricing</h3>
                  <div className="space-y-3">
                    {Object.entries(buffetSettings.sessions).map(([sessionKey, sessionData]) => (
                      sessionData.isActive && (
                        <div key={sessionKey} className="border-b border-blue-200 pb-2 last:border-b-0">
                          <div className="font-medium text-blue-800 capitalize mb-1">
                            {sessionKey} ({sessionData.startTime} - {sessionData.endTime})
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="text-center">
                              <div className="text-blue-700">Adult</div>
                              <div className="font-medium">£{sessionData.adultPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700">Child</div>
                              <div className="font-medium">£{sessionData.childPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700">Infant</div>
                              <div className="font-medium">£{sessionData.infantPrice.toFixed(2)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-700">Drinks</div>
                              <div className="font-medium">£{(buffetSettings.sessionSpecificExtraDrinksPricing?.[currentSession?.type]?.adultPrice || buffetSettings.extraDrinksPricing?.adultPrice || buffetSettings.extraDrinksPrice)?.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="adults">
                  Adults {isSecondaryDevice && `(Max: ${selectedTable?.availableAdultCapacity})`}
                </Label>
                <span className="text-sm text-gray-500">
                  {guestCounts.adults}/{isSecondaryDevice ? selectedTable?.availableAdultCapacity : selectedTable?.capacity} capacity
                </span>
              </div>
              <Input
                id="adults"
                type="number"
                min="1"
                max={isSecondaryDevice ? selectedTable?.availableAdultCapacity : selectedTable?.capacity || 8}
                value={guestCounts.adults}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value) || 1;
                  const maxCapacity = isSecondaryDevice ? selectedTable?.availableAdultCapacity || 0 : selectedTable?.capacity || 8;
                  setGuestCounts((prev) => ({
                    ...prev,
                    adults: Math.max(1, Math.min(value, maxCapacity)),
                  }));
                }}
                className={guestCounts.adults >= (isSecondaryDevice ? selectedTable?.availableAdultCapacity || 0 : selectedTable?.capacity || 8) ? "border-red-300" : ""}
              />
              <Progress 
                value={(guestCounts.adults / (isSecondaryDevice ? selectedTable?.availableAdultCapacity || 1 : selectedTable?.capacity || 8)) * 100} 
                className="h-2"
              />
              {guestCounts.adults >= (isSecondaryDevice ? selectedTable?.availableAdultCapacity || 0 : selectedTable?.capacity || 8) && (
                <p className="text-sm text-red-600">Table capacity reached</p>
              )}
            </div>

            {/* Always show all form fields for both primary and secondary devices */}
            <>
              <div className="space-y-2">
                <Label htmlFor="children">Children (3-12 years)</Label>
                <Input
                  id="children"
                  type="number"
                  min="0"
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
            </>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={guestCounts.adults === 0}
            >
              {isSecondaryDevice ? 'Join Table' : 'Confirm Selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiter Verification Modal */}
      <WaiterVerificationModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
        onVerified={handleWaiterVerified}
      />
    </div>
  );
}
