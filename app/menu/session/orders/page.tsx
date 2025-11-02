"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrders, getOrdersByTableSession } from "@/lib/api/orders-client";
import { fetchUsers } from "@/lib/api/users";
import { getBuffetSettings } from "@/lib/api/settings";
import { getTableSession, type TableSession } from "@/lib/api/table-sessions";
import {
  initializeSocketClient,
  joinTableRoom,
  onTableSessionUpdate,
  offTableSessionUpdate,
} from "@/lib/socket-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Users,
  Coffee,
  CheckCircle,
  User,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import SessionEndedModal from "@/components/SessionEndedModal";
import SplitBillModal from "@/components/SplitBillModal";
import I18nProvider from "@/components/providers/i18n-provider";
import LanguageSwitcher from "@/components/ui/language-switcher";
import { useTranslation } from "react-i18next";

export default function SessionOrdersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [waiterPin, setWaiterPin] = useState("");
  const [validatedWaiter, setValidatedWaiter] = useState<any>(null);
  const [pinError, setPinError] = useState("");
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [tipAmount, setTipAmount] = useState<number>(0); // New state for tips
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState<any>();
  const [guestCounts, setGuestCounts] = useState({
    adults: 0,
    children: 0,
    infants: 0,
    includeDrinks: false,
  });
  const [buffetSettings, setBuffetSettings] = useState<any>(null);
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [splitBills, setSplitBills] = useState<any[]>([]);
  const [currentSplitIndex, setCurrentSplitIndex] = useState(0);
  const [isSecondaryDevice, setIsSecondaryDevice] = useState<boolean>(false);

  // Get current session based on time
  const getCurrentSession = () => {
    if (!buffetSettings?.sessions) return null;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const sessions = [
      { key: "breakfast", data: buffetSettings.sessions.breakfast },
      { key: "lunch", data: buffetSettings.sessions.lunch },
      { key: "dinner", data: buffetSettings.sessions.dinner },
    ];

    for (const session of sessions) {
      if (!session.data.isActive) continue;

      const [startHour, startMin] = session.data.startTime
        .split(":")
        .map(Number);
      const [endHour, endMin] = session.data.endTime.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (currentTimeInMinutes >= startTime && currentTimeInMinutes < endTime) {
        return session;
      }
    }

    return null;
  };

  // Get current session and session data
  const currentSession = getCurrentSession();
  const sessionData = {
    adults: guestCounts.adults,
    children: guestCounts.children,
    infants: guestCounts.infants,
    extraDrinks: guestCounts.includeDrinks || false,
    adultPrice: currentSession?.data?.adultPrice || 25,
    childPrice: currentSession?.data?.childPrice || 15,
    infantPrice: currentSession?.data?.infantPrice || 0,
    drinkPrice: buffetSettings?.extraDrinksPrice || 5, // Keep for backward compatibility
    extraDrinksPricing: buffetSettings?.sessionSpecificExtraDrinksPricing?.[
      currentSession?.type
    ] ||
      buffetSettings?.extraDrinksPricing || {
        adultPrice: 5,
        childPrice: 3,
        infantPrice: 0,
      },
  };

  // Note: Split Bill is gated by table session's isSecondaryDevice

  // Load real data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get table ID from localStorage and fetch table data
        const storedTableId = localStorage.getItem("selectedTableId");
        if (storedTableId) {
          // Extract table number from table ID (assuming format like 'table-1', 'table-2', etc.)

          setTableNumber(storedTableId);
        }

        // Fetch guest counts from DB table session (no localStorage)
        if (storedTableId) {
          try {
            const groupType = localStorage.getItem("groupType") || undefined;
            const session: TableSession | null = await getTableSession(
              storedTableId,
              groupType
            );

            // Check if session has ended (either sessionEnded flag is true OR session is null)
            if (session?.sessionEnded || session === null) {
              setShowSessionEndedModal(true);
              return; // Don't continue loading if session has ended
            }
            // Track whether this table session is connected to a secondary device
            setIsSecondaryDevice(!!session?.isSecondaryDevice);

            if (session?.guestCounts) {
              setGuestCounts({
                adults: session.guestCounts.adults || 0,
                children: session.guestCounts.children || 0,
                infants: session.guestCounts.infants || 0,
                includeDrinks: session.guestCounts.includeDrinks || false,
              });
            }
          } catch (err) {
            console.error(
              "Failed to load table session for guest counts:",
              err
            );
          }
        }

        // Fetch buffet settings
        const settings = await getBuffetSettings();
        setBuffetSettings(settings.data);

        // No need to fetch waiters since we'll validate PIN directly

        // Fetch orders for this table using tableSessionId
        let tableSession = localStorage.getItem("tableSession");
        tableSession = tableSession ? JSON.parse(tableSession) : null;
        let tableOrders = [];
        console.log("tableSession=> ",tableSession)
        if (tableSession && tableSession?.id) {
          // Use the new API endpoint that fetches orders by tableSessionId
          tableOrders = await getOrdersByTableSession(tableSession.id);
          console.log("tableOrders => ",tableOrders)
      
        } else {
          // Fallback to old method if tableSessionId is not available
          const selectedTableId =
            localStorage.getItem("selectedTableId") || `table-${tableNumber}`;
          const storedGroupType = localStorage.getItem("groupType");
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
          
          tableOrders = await getOrders({
            tableId: selectedTableId,
            date: today,
            groupType: storedGroupType || undefined,
          });
        }
        setOrders(tableOrders);

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Socket connection for real-time updates
  useEffect(() => {
    const storedTableId = localStorage.getItem("selectedTableId");
    const groupType = localStorage.getItem("groupType");
    if (!storedTableId) return;

    // Initialize socket and join table room
    initializeSocketClient();
    joinTableRoom(storedTableId, groupType || undefined);

    // Listen for table session updates
    const handleSessionUpdate = (updatedSession: TableSession | null) => {
      // Check if session has ended (either sessionEnded flag is true OR session is null)
      if (updatedSession?.sessionEnded || updatedSession === null) {
        setShowSessionEndedModal(true);
        return; // Don't continue processing if session has ended
      }

      // Update guest counts if changed
      if (updatedSession.guestCounts) {
        setGuestCounts({
          adults: updatedSession.guestCounts.adults || 0,
          children: updatedSession.guestCounts.children || 0,
          infants: updatedSession.guestCounts.infants || 0,
          includeDrinks: updatedSession.guestCounts.includeDrinks || false,
        });
      }
    };

    onTableSessionUpdate(handleSessionUpdate);

    // Cleanup on unmount
    return () => {
      offTableSessionUpdate(handleSessionUpdate);
    };
  }, []);

  const calculateSessionTotal = () => {
    let total = 0;
    // Buffet session pricing
    total += sessionData.adults * sessionData.adultPrice;
    total += sessionData.children * sessionData.childPrice;
    total += sessionData.infants * sessionData.infantPrice;
    if (sessionData.extraDrinks) {
      // Use user-type-specific pricing for extra drinks
      total += sessionData.adults * sessionData.extraDrinksPricing.adultPrice;
      total += sessionData.children * sessionData.extraDrinksPricing.childPrice;
      total += sessionData.infants * sessionData.extraDrinksPricing.infantPrice;
    }

    // Add individual item prices from orders
    orders.forEach((order) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemPrice = item.price || 0;
          const itemQuantity = item.quantity || 1;
          total += itemPrice * itemQuantity;
        });
      }
    });

    return total;
  };

  const grandTotal = calculateSessionTotal();

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "preparing":
        return "bg-blue-100 text-blue-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "served":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePayment = async () => {
    if (!waiterPin || waiterPin.trim().length !== 4) {
      setPinError("Please enter a valid 4-digit PIN");
      return;
    }

    setPinError("");
    setIsProcessing(true);

    try {
      // Validate PIN
      const pinResponse = await fetch("/api/users/validate-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pin: waiterPin }),
      });

      const pinResult = await pinResponse.json();

      if (!pinResponse.ok || !pinResult.success) {
        setPinError(pinResult.error || "Invalid PIN");
        setIsProcessing(false);
        return;
      }

      const waiter = pinResult.data;
      setValidatedWaiter(waiter);
      setIsProcessing(false);

      // Show split bill modal after PIN validation
      if (isSecondaryDevice) {
        setShowSplitBill(true);
      }
    } catch (error) {
      console.error("PIN validation error:", error);
      setIsProcessing(false);
      setPinError(
        `Validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSplitBillConfirm = (splits: any[]) => {
    setSplitBills(splits);
    setShowSplitBill(false);
    setCurrentSplitIndex(0);

    // Process first split payment
    if (splits.length > 0) {
      processPayment(splits[0], 0);
    }
  };

  const processPayment = async (splitData: any, splitIndex: number) => {
    setIsProcessing(true);

    try {
      const selectedTableId = localStorage.getItem("selectedTableId");
      const storedGroupType = localStorage.getItem("groupType");
      const paymentData = {
        tableId: selectedTableId || `table-${tableNumber}`,
        tableNumber: tableNumber,
        waiterId: validatedWaiter.id,
        waiterName: validatedWaiter.name,
        paymentMethod: splitData.paymentMethod, // Use individual payment method
        totalAmount: splitData.total,
        sessionType: currentSession?.key || "lunch",
        groupType: storedGroupType || undefined,
        isSplit: true, // Mark as split payment
        splitInfo: {
          totalSplits: splitBills.length,
          splitIndex: splitIndex + 1,
          customerName: splitData.customerName,
          originalTotalAmount: grandTotal
        },
        sessionData: {
          adults: splitData.sessionCharges.adults,
          children: splitData.sessionCharges.children,
          infants: splitData.sessionCharges.infants,
          extraDrinks: sessionData.extraDrinks,
          adultPrice: sessionData.adultPrice,
          childPrice: sessionData.childPrice,
          infantPrice: sessionData.infantPrice,
          drinkPrice: sessionData.drinkPrice,
        },
      };

      // Call payment API
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Payment failed");
      }

      console.log(
        `Payment ${splitIndex + 1}/${splitBills.length} of £${
          splitData.total
        } successfully recorded for ${splitData.customerName}:`,
        result.data
      );

      // Check if there are more splits to process
      if (splitIndex + 1 < splitBills.length) {
        setCurrentSplitIndex(splitIndex + 1);
        // Process next split after a short delay
        setTimeout(() => {
          processPayment(splitBills[splitIndex + 1], splitIndex + 1);
        }, 1000);
      } else {
        // All payments completed
        setIsProcessing(false);
        setPaymentComplete(true);

        // Clear all localStorage data after successful payment
        localStorage.removeItem("tableId");
        localStorage.removeItem("guestCounts");
        localStorage.removeItem("sessionData");
        localStorage.removeItem("buffetSettings");
        localStorage.removeItem("waiters");
        localStorage.removeItem("orders");
        localStorage.removeItem("currentSession");
        localStorage.removeItem("selectedWaiterId");

        // Clear any other session-related data
        localStorage.clear();

        // Redirect to tables page after 2 seconds
        setTimeout(() => {
          router.push("/menu/tables");
        }, 2000);
      }
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      setPinError(
        `Payment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSinglePayment = async () => {
    setIsProcessing(true);

    try {
      // Prepare payment data
      const selectedTableId = localStorage.getItem("selectedTableId");
      const storedGroupType = localStorage.getItem("groupType");
      const paymentData = {
        tableId: selectedTableId || `table-${tableNumber}`,
        tableNumber: tableNumber,
        waiterId: validatedWaiter.id,
        waiterName: validatedWaiter.name,
        paymentMethod: paymentMethod,
        totalAmount: grandTotal,
        tipAmount: tipAmount, // Include tip amount
        sessionType: currentSession?.key || "lunch",
        groupType: storedGroupType || undefined,
        sessionData: {
          adults: sessionData.adults,
          children: sessionData.children,
          infants: sessionData.infants,
          extraDrinks: sessionData.extraDrinks,
          adultPrice: sessionData.adultPrice,
          childPrice: sessionData.childPrice,
          infantPrice: sessionData.infantPrice,
          drinkPrice: sessionData.drinkPrice,
        },
      };

      // Call payment API
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Payment failed");
      }

      setIsProcessing(false);
      setPaymentComplete(true);

      console.log(
        `Payment of £${grandTotal} successfully recorded:`,
        result.data
      );

      // Clear all localStorage data after successful payment
      localStorage.removeItem("tableId");
      localStorage.removeItem("guestCounts");
      localStorage.removeItem("sessionData");
      localStorage.removeItem("buffetSettings");
      localStorage.removeItem("waiters");
      localStorage.removeItem("orders");
      localStorage.removeItem("currentSession");
      localStorage.removeItem("selectedWaiterId");

      // Clear any other session-related data
      localStorage.clear();

      // Redirect to tables page after 2 seconds
      setTimeout(() => {
        router.push("/menu/tables");
      }, 2000);
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      setPinError(
        `Payment failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <I18nProvider>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t("orders.session_orders")}
              </h1>
              <p className="text-gray-600">{t("orders.review_orders")}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Language Switcher */}
              <LanguageSwitcher />
              <Button
                variant="outline"
                onClick={() => router.back()}
                aria-label={t("orders.go_back")}
              >
                Back
              </Button>
            </div>
          </div>

          {/* Session Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">
                      {t("orders.session_guests")}
                    </div>
                    <div className="text-sm text-blue-700">
                      {sessionData.adults} Adults, {sessionData.children}{" "}
                      Children, {sessionData.infants} Infants
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Coffee className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">
                      {t("orders.extra_drinks")}
                    </div>
                    <div className="text-sm text-blue-700">
                      {sessionData.extraDrinks
                        ? `${t("orders.included")} (+£${(
                            sessionData.adults *
                              sessionData.extraDrinksPricing.adultPrice +
                            sessionData.children *
                              sessionData.extraDrinksPricing.childPrice +
                            sessionData.infants *
                              sessionData.extraDrinksPricing.infantPrice
                          ).toFixed(2)})`
                        : t("orders.not_included")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-semibold text-blue-900">
                      {t("orders.session_total")}
                    </div>
                    <div className="text-xl font-bold text-blue-900">
                      £{grandTotal}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  {t("orders.loading_orders")}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t("orders.no_orders")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          {t("orders.order_id")}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          {t("orders.time")}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          {t("orders.items")}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          {t("orders.total_amount")}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          {t("orders.status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm text-gray-600">
                              {order.id.split("-")[1]?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {order.time}
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              {order.items.map((item: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <span className="font-medium">
                                    {item.name}
                                  </span>
                                  <span className="text-gray-500 ml-2">
                                    ×{item.quantity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-green-600">
                              ${(order.totalAmount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge
                              className={`${getStatusColor(
                                order.status
                              )} border-0`}
                            >
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Total Card - E-commerce Style */}
          <Card className="bg-white border-gray-200 shadow-lg">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-xl font-bold text-gray-900">
                {t("orders.order_summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Buffet Charges */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 border-b pb-2">
                    {t("orders.buffet_access")}
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {t("orders.adults")} ({sessionData.adults} × £
                        {sessionData.adultPrice})
                      </span>
                      <span className="font-medium">
                        £
                        {(sessionData.adults * sessionData.adultPrice).toFixed(
                          2
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {t("orders.children")} ({sessionData.children} × £
                        {sessionData.childPrice})
                      </span>
                      <span className="font-medium">
                        £
                        {(
                          sessionData.children * sessionData.childPrice
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">
                        {t("orders.infants")} ({sessionData.infants} × £
                        {sessionData.infantPrice})
                      </span>
                      <span className="font-medium">
                        £
                        {(
                          sessionData.infants * sessionData.infantPrice
                        ).toFixed(2)}
                      </span>
                    </div>
                    {sessionData.extraDrinks && (
                      <div className="space-y-1">
                        <div className="text-gray-600 font-medium">
                          {t("orders.extra_drinks_pricing")}
                        </div>
                        {sessionData.adults > 0 && (
                          <div className="flex justify-between items-center text-sm pl-4">
                            <span className="text-gray-600">
                              {t("orders.adults")} ({sessionData.adults} × £
                              {sessionData.extraDrinksPricing.adultPrice})
                            </span>
                            <span className="font-medium">
                              £
                              {(
                                sessionData.adults *
                                sessionData.extraDrinksPricing.adultPrice
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {sessionData.children > 0 && (
                          <div className="flex justify-between items-center text-sm pl-4">
                            <span className="text-gray-600">
                              {t("orders.children")} ({sessionData.children} × £
                              {sessionData.extraDrinksPricing.childPrice})
                            </span>
                            <span className="font-medium">
                              £
                              {(
                                sessionData.children *
                                sessionData.extraDrinksPricing.childPrice
                              ).toFixed(2)}
                            </span>
                          </div>
                        )}
                        {sessionData.infants > 0 &&
                          sessionData.extraDrinksPricing.infantPrice > 0 && (
                            <div className="flex justify-between items-center text-sm pl-4">
                              <span className="text-gray-600">
                                {t("orders.infants")} ({sessionData.infants} × £
                                {sessionData.extraDrinksPricing.infantPrice})
                              </span>
                              <span className="font-medium">
                                £
                                {(
                                  sessionData.infants *
                                  sessionData.extraDrinksPricing.infantPrice
                                ).toFixed(2)}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-medium text-gray-800">
                      {t("orders.buffet_subtotal")}
                    </span>
                    <span className="font-semibold">
                      £
                      {(
                        sessionData.adults * sessionData.adultPrice +
                        sessionData.children * sessionData.childPrice +
                        sessionData.infants * sessionData.infantPrice +
                        (sessionData.extraDrinks ? sessionData.drinkPrice : 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order Items Total */}
                {orders.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800 border-b pb-2">
                      {t("orders.additional_orders")}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">
                          {t("orders.total_orders")}
                        </span>
                        <span className="font-medium">
                          £
                          {orders
                            .reduce(
                              (sum, order) => sum + (order.totalAmount || 0),
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grand Total */}
                <div className="border-t-2 border-gray-300 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">
                      {t("orders.total_amount_final")}
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      £{grandTotal}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("orders.including_all")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-800">
                      {t("orders.payment_required")}
                    </h3>
                    <p className="text-amber-700">
                     Please pay £{grandTotal} {t("orders.please_pay",)}
                    </p>
                  </div>
                </div>

                <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                      {t("orders.pay_with_waiter")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {t("orders.waiter_verification")}
                      </DialogTitle>
                      <DialogDescription>
                        {t("orders.enter_waiter_pin")+grandTotal}
                      </DialogDescription>
                    </DialogHeader>

                    {paymentComplete ? (
                      <div className="text-center py-6">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-green-700 mb-2">
                          {t("orders.payment_successful")}
                        </h3>
                        <p className="text-gray-600">
                          {t("orders.redirecting")}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4 py-4">
                          <div>
                            <Label htmlFor="waiterPin">
                              {t("orders.waiter_pin")}
                            </Label>
                            <Input
                              id="waiterPin"
                              type="password"
                              placeholder={t("orders.enter_pin")}
                              value={waiterPin}
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 4);
                                setWaiterPin(value);
                                if (pinError) setPinError("");
                              }}
                              maxLength={4}
                              className={`mt-1 text-center text-lg tracking-widest ${
                                pinError ? "border-red-500" : ""
                              }`}
                            />
                            {pinError && (
                              <p className="text-sm text-red-600 mt-1">
                                {pinError}
                              </p>
                            )}
                            {validatedWaiter && (
                              <p className="text-sm text-green-600 mt-1">
                                {t("orders.validated")} {validatedWaiter.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label>Payment Method</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant={
                                  paymentMethod === "cash"
                                    ? "default"
                                    : "outline"
                                }
                                className={
                                  paymentMethod === "cash"
                                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                                    : ""
                                }
                                onClick={() => setPaymentMethod("cash")}
                                aria-pressed={paymentMethod === "cash"}
                              >
                                <DollarSign className="w-4 h-4 mr-2" />{" "}
                                {t("orders.cash")}
                              </Button>
                              <Button
                                type="button"
                                variant={
                                  paymentMethod === "card"
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => setPaymentMethod("card")}
                                aria-pressed={paymentMethod === "card"}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />{" "}
                                {t("orders.card")}
                              </Button>
                            </div>
                          </div>

                          {/* Tips Section */}
                          <div className="space-y-2">
                            <Label htmlFor="tipAmount">
                              Add Tip (Optional)
                            </Label>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-medium">£</span>
                              <Input
                                id="tipAmount"
                                type="number"
                                placeholder="0.00"
                                value={tipAmount || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setTipAmount(Math.max(0, value));
                                }}
                                min="0"
                                step="0.01"
                                className="text-center"
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTipAmount(Math.round(grandTotal * 0.1 * 100) / 100)}
                                className="text-xs"
                              >
                                10%
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTipAmount(Math.round(grandTotal * 0.15 * 100) / 100)}
                                className="text-xs"
                              >
                                15%
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setTipAmount(Math.round(grandTotal * 0.2 * 100) / 100)}
                                className="text-xs"
                              >
                                20%
                              </Button>
                            </div>
                            {tipAmount > 0 && (
                              <p className="text-sm text-green-600 mt-1">
                                Total with tip: £{(grandTotal + tipAmount).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>

                        <DialogFooter className="flex-col gap-2 pt-4 border-t">
                          {validatedWaiter ? (
                            <div>
                              {/* Show split bill button if adults > 1 or if it's a secondary device */}
                              {(sessionData.adults > 1 || isSecondaryDevice) && (
                                <Button
                                  onClick={() => setShowSplitBill(true)}
                                  variant="outline"
                                  className="w-full mb-2"
                                >
                                  Split Bill ({sessionData.adults} Adults)
                                </Button>
                              )}
                              <Button
                                onClick={handleSinglePayment}
                                disabled={isProcessing}
                                className="w-full bg-green-600 hover:bg-green-700"
                              >
                                {isProcessing
                                  ? t("orders.processing")
                                  : `${t("orders.pay_full_amount")} ${(grandTotal + tipAmount).toFixed()}`}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={handlePayment}
                              disabled={
                                !waiterPin ||
                                waiterPin.length !== 4 ||
                                isProcessing
                              }
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              {isProcessing
                                ? t("orders.validating")
                                : t("orders.validate_pin")}
                            </Button>
                          )}
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Ended Modal */}
        <SessionEndedModal
          isOpen={showSessionEndedModal}
          tableNumber={tableNumber}
        />

        {/* Split Bill Modal */}
        <SplitBillModal
          isOpen={showSplitBill}
          onClose={() => setShowSplitBill(false)}
          onConfirm={handleSplitBillConfirm}
          orders={orders}
          sessionData={sessionData}
          totalAmount={grandTotal}
        />
      </div>
    </I18nProvider>
  );
}
