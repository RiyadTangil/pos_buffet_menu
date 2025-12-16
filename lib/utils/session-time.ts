
import { BuffetSettings } from "@/lib/api/settings";
import { TableSession } from "@/lib/api/table-sessions";

interface CurrentSession {
  key: string;
  data: {
    startTime: string;
    endTime: string;
    isActive: boolean;
    sessionTimeLimitMinutes?: number;
  };
}

export function getExtendedUntilISO(
  buffetSettings: BuffetSettings | null,
  tableSession: TableSession | null | undefined,
  currentSession: CurrentSession | null
): string | undefined {
  if (!buffetSettings || !currentSession) return undefined;

  const getSpecialTableTimeLimitMinutes = () => {
    if (!tableSession) return 0;
    const special = buffetSettings.specialTableItemsLimit?.find(
      (s: any) => s.tableId === tableSession.tableId
    );
    return special?.timeLimit || 0;
  };

  const getSessionSpecificTimeLimitMinutes = () => {
    const key = currentSession.key as "breakfast" | "lunch" | "dinner";
    const sessionCfg = buffetSettings.sessions[key];
    return (sessionCfg as any)?.sessionTimeLimitMinutes || 0;
  };

  const tableMin = getSpecialTableTimeLimitMinutes();
  const sessionMin = getSessionSpecificTimeLimitMinutes();
  const effectiveMin =
    (sessionMin > 0 ? sessionMin : 0) + (tableMin > 0 ? tableMin : 0);

  if (!tableSession?.createdAt) return undefined;

  if (effectiveMin > 0) {
    const startMs = new Date(tableSession.createdAt).getTime();
    const final = new Date(startMs + effectiveMin * 60 * 1000);
    return final.toISOString();
  }

  // Fallback: no session/table specific limits, use official session end
  const [endHour, endMin] = currentSession.data.endTime.split(":").map(Number);
  const endTime = new Date();
  endTime.setHours(endHour, endMin, 0, 0);
  const now = new Date();
  if (endTime < now) endTime.setDate(endTime.getDate() + 1);
  return endTime.toISOString();
}
