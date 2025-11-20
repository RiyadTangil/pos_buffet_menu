"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateTableStatus, updateTableGuests, type Table } from "@/lib/api/tables";
import { initializeSocketClient, joinTablesRoom, leaveTablesRoom, onTablesUpdate, offTablesUpdate } from "@/lib/socket-client";
import { type BuffetSettings } from "@/lib/api/settings";
import {
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
import { Shield } from "lucide-react";
import I18nProvider from "@/components/providers/i18n-provider";
import LanguageSwitcher from "@/components/ui/language-switcher";
import { useTranslation } from "react-i18next";

interface GuestCounts {
  adults: number;
  children: number;
  infants: number;
  includeDrinks: boolean;
}

interface TableWithSession extends Table {
  session?: TableSession;
  availableAdultCapacity?: number;
  currentBillTotal?: number;
}

export default function TablesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [tableStates, setTableStates] = useState<TableWithSession[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableWithSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [buffetSettings, setBuffetSettings] = useState<BuffetSettings | null>(null);
  const [deviceId] = useState(() => generateDeviceId());
  const [isSecondaryDevice, setIsSecondaryDevice] = useState(false);
  const [verifiedWaiter, setVerifiedWaiter] = useState<{ name: string; role: string; pin: string } | null>(null);
  const [groupType, setGroupType] = useState<'same' | 'different'>('same');
  const [guestCounts, setGuestCounts] = useState<GuestCounts>({
    adults: 1,
    children: 0,
    infants: 0,
    includeDrinks: false,
  });

  // Check for existing table selection and redirect if found
  useEffect(() => {
    const checkExistingTableSelection = () => {
      const selectedTableId = localStorage.getItem('selectedTableId');
      const tableSession = localStorage.getItem('tableSession');
      const guestCounts = localStorage.getItem('guestCounts');

      // If user has already selected a table and has session data, redirect to menu/items
      if (selectedTableId && tableSession && guestCounts) {
        try {
          const parsedSession = JSON.parse(tableSession);
          const parsedGuestCounts = JSON.parse(guestCounts);

          // Verify that the session data is valid and not ended
          if (parsedSession && !parsedSession.sessionEnded &&
            (parsedGuestCounts.adults > 0 || parsedGuestCounts.children > 0 || parsedGuestCounts.infants > 0)) {
            //console.log('User already has table selection, redirecting to menu/items');
            router.push('/menu/items');
            return;
          }
        } catch (error) {
          console.error('Error parsing stored session data:', error);
          // Clear invalid data
          localStorage.removeItem('selectedTableId');
          localStorage.removeItem('tableSession');
          localStorage.removeItem('guestCounts');
        }
      }
    };

    checkExistingTableSelection();
  }, [router]);

  // Shared loader to fetch tables and settings
  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/menu/tables-data`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      const { success, data, error } = result || {}
      if (!success || !data) throw new Error(error || 'Failed to load')
      setTableStates(data.tables || [])
      setBuffetSettings(data.settings || null)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  };

  // Fetch tables and settings data on component mount
  const hasLoaded = useRef(false);
  useEffect(() => {
    if (hasLoaded.current) return
    hasLoaded.current = true
    loadData();
  }, []);

  // Socket: join tables room and refresh on updates
  useEffect(() => {
    initializeSocketClient();
    joinTablesRoom();

    const handleTablesUpdate = () => {
      // Refresh tables data on any update
      loadData();
    };

    onTablesUpdate(handleTablesUpdate);

    return () => {
      offTablesUpdate();
      leaveTablesRoom();
    };
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

  // Derive a visual status for color mapping based on session/capacity
  const getVisualStatus = (table: TableWithSession) => {
    if (table.status === "cleaning") return "cleaning";
    // If a session exists, prioritize occupancy colors over the raw status
    if (table.session) {
      const remaining = table.availableAdultCapacity ?? 0;
      if (remaining > 0) return "partial"; // seats left
      return "full"; // no capacity
    }
    if (table.status === "available") return "available";
    if (table.status === "selected") return "selected";
    if (table.status === "occupied") return "full";
    return "unavailable";
  };

  const getTableStatus = (table: TableWithSession) => {
    if (table.status === "available" && !table.session) {
      return t("tables.available");
    } else if (table.session) {
      if (table.availableAdultCapacity! > 0) {
        return `${t("tables.occupied")} (${table.availableAdultCapacity} spots left)`;
      } else {
        return t("tables.full");
      }
    } else if (table.status === "selected") {
      return t("tables.selected");
    } else if (table.status === "occupied") {
      return t("tables.occupied");
    }
    return t("tables.unavailable");
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

  const handleWaiterVerified = (waiterInfo: { name: string; role: string; pin: string; groupType: 'same' | 'different' }) => {
    setVerifiedWaiter({ name: waiterInfo.name, role: waiterInfo.role, pin: waiterInfo.pin });
    setGroupType(waiterInfo.groupType);
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
          waiterPin: verifiedWaiter?.pin,
          isSecondaryDevice,
          groupType
        });

        // Store session data in localStorage for backward compatibility
        localStorage.setItem("guestCounts", JSON.stringify(guestCounts));
        localStorage.setItem("selectedTableId", selectedTable.id);
        localStorage.setItem("tableSession", JSON.stringify(sessionData));
        localStorage.setItem("groupType", groupType);
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
    <I18nProvider>
      <div className="min-h-screen bg-[#F8F9FD] relative">
        {/* Top Left KALA Logo */}
        <div className="mb-5 bg-white pb-4 relative">
          <img
            src="/images/logo.png"
            alt="KALA Systems Logo"
            className="h-20 w-auto ms-5"
          />
          {/* Language Switcher */}
          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>
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
                  const getTableColors = (visualStatus: string) => {
                    switch (visualStatus) {
                      case 'available':
                        return 'bg-green-100 border-2 border-green-300 text-green-800 hover:bg-green-200';
                      case 'partial':
                        return 'bg-amber-100 border-2 border-amber-300 text-amber-800';
                      case 'full':
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
                        ${isTableClickable(table)
                            ? "cursor-pointer hover:shadow-md transform hover:scale-105 active:scale-95"
                            : "cursor-not-allowed"
                          }
                        ${getTableColors(getVisualStatus(table))}
                      `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-base sm:text-lg font-bold">Table {table.number}</div>

                          {table.session && (
                            <div className="flex items-center text-xs text-blue-600 gap-2">
                              <span title="Adults">👨 {table.session.guestCounts.adults}</span>
                              <span title="Children">🧒 {table.session.guestCounts.children}</span>
                              <span title="Infants">👶 {table.session.guestCounts.infants}</span>
                            </div>
                          )}
                        </div>
                        {/* Centered bill total from backend */}
                        {typeof table.currentBillTotal === 'number' && (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-xs sm:text-base font-extrabold text-black/80">
                              £{table.currentBillTotal.toFixed()}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm opacity-75">
                            {getTableStatus(table)}

                          </div>
                          <div className="text-xs sm:text-sm text-red-600 opacity-75">
                            Cap:{table.capacity}
                          </div>
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
        {(() => {
          // Compute live counts for legend statuses
          const counts = (tableStates || []).reduce(
            (acc, table) => {
              const status = getVisualStatus(table)
              if (status === 'available') acc.available += 1
              else if (status === 'partial') acc.partial += 1
              else if (status === 'full') acc.full += 1
              else if (status === 'cleaning') acc.cleaning += 1
              return acc
            },
            { available: 0, partial: 0, full: 0, cleaning: 0 }
          )
          return (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-md p-4 border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 text-center">Table Status Colors</h3>
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-green-800 font-medium">Available ({counts.available})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-100 border-2 border-amber-300 rounded"></div>
              <span className="text-amber-800 font-medium">Partially Full ({counts.partial})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-red-800 font-medium">Full ({counts.full})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded"></div>
              <span className="text-yellow-800 font-medium">Cleaning ({counts.cleaning})</span>
              </div>
            </div>
          </div>
          )
        })()}

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
          <WaiterVerificationModal
            isOpen={isWaiterModalOpen}
            onClose={() => setIsWaiterModalOpen(false)}
            onVerified={handleWaiterVerified}
            title={t("tables.waiter_verification")}
            description="Verify your PIN and choose group option."
          />
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
                    {t("tables.adults")} {isSecondaryDevice && `(Max: ${selectedTable?.availableAdultCapacity})`}
                  </Label>
                  <span className="text-sm text-gray-500">
                    {guestCounts.adults}/{isSecondaryDevice ? selectedTable?.availableAdultCapacity : selectedTable?.capacity} capacity
                  </span>
                </div>
                <Input
                  id="adults"
                  type="number"
                  min={isSecondaryDevice ? 0 : 1}
                  max={isSecondaryDevice ? selectedTable?.availableAdultCapacity : selectedTable?.capacity || 8}
                  value={guestCounts.adults}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value) || 0;
                    const maxCapacity = isSecondaryDevice ? selectedTable?.availableAdultCapacity || 0 : selectedTable?.capacity || 8;
                    const minValue = isSecondaryDevice ? 0 : 1;
                    setGuestCounts((prev) => ({
                      ...prev,
                      adults: Math.max(minValue, Math.min(value, maxCapacity)),
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
                  <Label htmlFor="children">{t("tables.children")}</Label>
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
                  <Label htmlFor="infants">{t("tables.infants")}</Label>
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
                    {t("tables.include_drinks")}
                  </Label>
                </div>
              </>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleModalClose}>
                {t("tables.cancel")}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={(!isSecondaryDevice && guestCounts.adults === 0) || (isSecondaryDevice && !verifiedWaiter)}
              >
                {isSecondaryDevice ? t("tables.join_table") : t("tables.confirm_selection")}
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
    </I18nProvider>
  );
}
