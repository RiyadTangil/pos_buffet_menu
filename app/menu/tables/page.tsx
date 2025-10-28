"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchTables, updateTableStatus, updateTableGuests, type Table } from "@/lib/api/tables";
import { getBuffetSettings, type BuffetSettings } from "@/lib/api/settings";
import { createDeviceSession, DeviceSessionManager } from "@/lib/api/device-sessions";
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
import { TableInUseWarning } from "@/components/ui/table-in-use-warning";
import { DeviceGroupSelection } from "@/components/ui/device-group-selection";
import { WaiterPinVerification } from "@/components/ui/waiter-pin-verification";
import { 
  generateSessionId, 
  setCurrentSessionId, 
  getRemainingCapacity, 
  canFitInTable,
  hasActiveSessionForTable,
  generateDeviceId
} from "@/lib/utils";

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
  const [buffetSettings, setBuffetSettings] = useState<BuffetSettings | null>(null);
  const [showCapacityWarning, setShowCapacityWarning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Multi-device modal states
  const [showTableInUseWarning, setShowTableInUseWarning] = useState(false);
  const [showDeviceGroupSelection, setShowDeviceGroupSelection] = useState(false);
  const [showWaiterPinVerification, setShowWaiterPinVerification] = useState(false);
  const [selectedGroupType, setSelectedGroupType] = useState<'different' | 'same' | null>(null);
  
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
        setTableStates(tablesData);
        setBuffetSettings(settingsData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Real-time polling for table updates
  useEffect(() => {
    const refreshTableData = async () => {
      try {
        setIsRefreshing(true);
        const tablesData = await fetchTables();
        setTableStates(tablesData);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to refresh table data:', error);
      } finally {
        setIsRefreshing(false);
      }
    };

    // Set up polling interval (refresh every 10 seconds)
    const pollInterval = setInterval(refreshTableData, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(pollInterval);
  }, []);

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      setIsRefreshing(true);
      const tablesData = await fetchTables();
      setTableStates(tablesData);
      setLastUpdated(new Date());
      toast.success('Table data refreshed');
    } catch (error) {
      console.error('Failed to refresh table data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const handleTableClick = (table: Table) => {
    // Allow selection if table is available OR if it has remaining capacity
    const remainingCapacity = getRemainingCapacity(table);
    const isAvailable = table.status === "available";
    const hasCapacity = remainingCapacity > 0;
    const hasActiveSession = hasActiveSessionForTable(table.id);

    if (isAvailable || hasCapacity || hasActiveSession) {
      setSelectedTable(table);
      
      // Check if table is already in use (not available but has capacity)
      if (!isAvailable && hasCapacity) {
        setShowTableInUseWarning(true);
      } else {
        setShowCapacityWarning(false);
        setIsModalOpen(true);
      }
    } else {
      toast.error(`Table ${table.number} is full and cannot accommodate more guests.`);
    }
  };

  // Multi-device flow handlers
  const handleAddDevice = () => {
    setShowTableInUseWarning(false);
    setShowDeviceGroupSelection(true);
  };

  const handleSelectDifferentGroup = () => {
    setSelectedGroupType('different');
    setShowDeviceGroupSelection(false);
    setShowCapacityWarning(true);
    setIsModalOpen(true);
  };

  const handleSelectSameGroup = () => {
    setSelectedGroupType('same');
    setShowDeviceGroupSelection(false);
    setShowWaiterPinVerification(true);
  };

  const handleWaiterPinVerified = () => {
    setShowWaiterPinVerification(false);
    setShowCapacityWarning(true);
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (selectedTable) {
      try {
        // Only count adults for table capacity validation and currentGuests tracking
        const adultsCount = guestCounts.adults;
        const totalGuests = guestCounts.adults + guestCounts.children + guestCounts.infants;
        const remainingCapacity = getRemainingCapacity(selectedTable);
        
        // Validate capacity based on adults only (since only adults count towards table capacity)
        if (!canFitInTable(selectedTable, adultsCount)) {
          toast.error(`Cannot accommodate ${adultsCount} adults. Only ${remainingCapacity} spots remaining.`);
          return;
        }

        // Generate unique session ID and device ID
        const sessionId = generateSessionId(selectedTable.id);
        const deviceId = generateDeviceId();
        
        // Determine group type (default to 'different' if not set)
        const groupType = selectedGroupType || 'different';
        
        // Create device session
        const sessionResult = await createDeviceSession({
          sessionId,
          tableId: selectedTable.id,
          deviceId,
          groupType,
          guestCounts,
          waiterVerified: groupType === 'same'
        });

        if (!sessionResult.success) {
          toast.error('Failed to create device session. Please try again.');
          return;
        }

        // Calculate new guest count (add only adults to existing currentGuests)
        const newTotalGuests = selectedTable.currentGuests + adultsCount;
        
        // Update table status and guest count (only adults count)
        const newStatus = selectedTable.status === "available" ? "occupied" : selectedTable.status;
        await updateTableStatus(selectedTable.id, newStatus);
        await updateTableGuests(selectedTable.id, newTotalGuests);

        // Update local state (only adults count for currentGuests)
        setTableStates((prev) =>
          prev.map((table) =>
            table.id === selectedTable.id
              ? { ...table, status: newStatus as const, currentGuests: newTotalGuests }
              : table
          )
        );

        // Store session data in localStorage
        localStorage.setItem("guestCounts", JSON.stringify(guestCounts));
        localStorage.setItem("selectedTableId", selectedTable.id);
        localStorage.setItem("sessionId", sessionId);
        localStorage.setItem("deviceId", deviceId);
        localStorage.setItem("groupType", groupType);
        localStorage.setItem("groupId", sessionResult.data?.groupId || '');

        setIsModalOpen(false);
        
        // Show appropriate success message
        if (groupType === 'same') {
          toast.success(`Joined Table ${selectedTable.number} as same group! Your orders will be synchronized.`);
        } else if (showCapacityWarning) {
          toast.success(`Joined Table ${selectedTable.number}! You're sharing this table with other customers.`);
        } else {
          toast.success(`Table ${selectedTable.number} selected successfully!`);
        }
        
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
    setShowCapacityWarning(false);
    setShowTableInUseWarning(false);
    setShowDeviceGroupSelection(false);
    setShowWaiterPinVerification(false);
    setSelectedGroupType(null);
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
          {/* Real-time Update Header */}
          <div className="flex justify-between items-center mb-4 bg-white rounded-lg p-3 shadow-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              {isRefreshing && (
                <span className="text-xs text-blue-600 animate-pulse">Refreshing...</span>
              )}
            </div>
            <Button 
              onClick={handleManualRefresh} 
              disabled={isRefreshing}
              variant="outline" 
              size="sm"
              className="text-xs"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
            </Button>
          </div>
          
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
                const remainingCapacity = getRemainingCapacity(table);
                const isAvailable = table.status === "available";
                const hasCapacity = remainingCapacity > 0;
                const hasActiveSession = hasActiveSessionForTable(table.id);
                const canSelect = isAvailable || hasCapacity || hasActiveSession;
                
                const getTableColors = (status: string, hasCapacity: boolean, isAvailable: boolean) => {
                  if (isAvailable) {
                    return 'bg-green-100 border-2 border-green-300 text-green-800 hover:bg-green-200';
                  } else if (hasCapacity) {
                    return 'bg-orange-100 border-2 border-orange-300 text-orange-800 hover:bg-orange-200';
                  } else {
                    switch (status) {
                      case 'occupied':
                        return 'bg-red-100 border-2 border-red-300 text-red-800';
                      case 'cleaning':
                        return 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800';
                      case 'selected':
                        return 'bg-blue-100 border-2 border-blue-300 text-blue-800';
                      default:
                        return 'bg-gray-100 border-2 border-gray-300 text-gray-500';
                    }
                  }
                };
                
                return (
                  <div key={table.id}>
                    <div
                      onClick={() => handleTableClick(table)}
                      className={`
                        w-full h-20 sm:h-24 text-base sm:text-lg rounded-xl mb-2 p-2 sm:p-3 
                        flex flex-col justify-between transition-all duration-200 ease-in-out
                        ${
                          canSelect
                            ? "cursor-pointer hover:shadow-md transform hover:scale-105 active:scale-95"
                            : "cursor-not-allowed opacity-60"
                        }
                        ${getTableColors(table.status, hasCapacity, isAvailable)}
                      `}
                    >
                      <div className="text-base sm:text-lg font-bold">Table {table.number}</div>
                      <div className="text-xs sm:text-sm opacity-75">
                        {isAvailable ? (
                          `Available - ${table.capacity} seats`
                        ) : hasCapacity ? (
                          `${remainingCapacity} seats left`
                        ) : (
                          `Full - ${table.currentGuests}/${table.capacity}`
                        )}
                      </div>
                      {hasActiveSession && (
                        <div className="text-xs bg-blue-200 text-blue-800 px-1 rounded">Your Session</div>
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 border-2 border-orange-300 rounded"></div>
            <span className="text-orange-800 font-medium">Partially Full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
            <span className="text-red-800 font-medium">Full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
            <span className="text-blue-800 font-medium">Your Session</span>
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

          {/* Table Sharing Notice */}
          {showCapacityWarning && selectedTable && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="text-orange-500 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-800 mb-1">Table Sharing Notice</h4>
                  <p className="text-sm text-orange-700">
                    This table is currently occupied by other guests ({selectedTable.currentGuests}/{selectedTable.capacity} seats taken). 
                    You'll be sharing the table with them. Your orders will be kept separate.
                  </p>
                  <p className="text-xs text-orange-600 mt-2">
                    Remaining capacity: {getRemainingCapacity(selectedTable)} seats
                  </p>
                </div>
              </div>
            </div>
          )}

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
                <Label htmlFor="adults">Adults</Label>
                <span className="text-sm text-gray-500">
                  {guestCounts.adults}/{selectedTable?.capacity} capacity
                </span>
              </div>
              <Input
                id="adults"
                type="number"
                min="1"
                max={selectedTable?.capacity || 8}
                value={guestCounts.adults}
                onChange={(e) => {
                  const value = Number.parseInt(e.target.value) || 1;
                  const maxCapacity = selectedTable?.capacity || 8;
                  setGuestCounts((prev) => ({
                    ...prev,
                    adults: Math.max(1, Math.min(value, maxCapacity)),
                  }));
                }}
                className={guestCounts.adults >= (selectedTable?.capacity || 8) ? "border-red-300" : ""}
              />
              <Progress 
                value={(guestCounts.adults / (selectedTable?.capacity || 8)) * 100} 
                className="h-2"
              />
              {guestCounts.adults >= (selectedTable?.capacity || 8) && (
                <p className="text-sm text-red-600">Table capacity reached</p>
              )}
            </div>

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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>Confirm Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Multi-device modals */}
      <TableInUseWarning
        isOpen={showTableInUseWarning}
        onClose={handleModalClose}
        onAddDevice={handleAddDevice}
        tableNumber={selectedTable?.number || 0}
        currentGuests={selectedTable?.currentGuests || 0}
        capacity={selectedTable?.capacity || 0}
        remainingCapacity={getRemainingCapacity(selectedTable || { capacity: 0, currentGuests: 0 })}
      />

      <DeviceGroupSelection
        isOpen={showDeviceGroupSelection}
        onClose={handleModalClose}
        onSelectDifferentGroup={handleSelectDifferentGroup}
        onSelectSameGroup={handleSelectSameGroup}
        tableNumber={selectedTable?.number || 0}
      />

      <WaiterPinVerification
        isOpen={showWaiterPinVerification}
        onClose={handleModalClose}
        onVerified={handleWaiterPinVerified}
        tableNumber={selectedTable?.number || 0}
        tableId={selectedTable?.id || ''}
      />
    </div>
  );
}
