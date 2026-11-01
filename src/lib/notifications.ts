import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import type { PlanTask } from '@/types/db';

/**
 * Benachrichtigungen:
 * - Lokale Erinnerungen für Trainingsaufgaben (funktionieren in Expo Go, ohne Server).
 * - Push-Token für Server-Pushes (Tipps, Check-ins), sobald ein EAS-Projekt existiert (projectId).
 */
const supported = Platform.OS !== 'web';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!supported) return 'unsupported';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const req = await Notifications.requestPermissionsAsync();
  return req.granted ? 'granted' : 'denied';
}

export async function permissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!supported) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/** Expo-Push-Token, nur mit EAS-projectId (kommt mit EAS Build). Sonst null. */
export async function getPushToken(): Promise<string | null> {
  if (!supported) return null;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Lokale Erinnerungen für offene, zukünftige Aufgaben planen; erledigte/alte entfernen. */
export async function syncTaskReminders(tasks: (PlanTask & { planActive: boolean })[], title: string) {
  if (!supported || (await permissionStatus()) !== 'granted') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = new Set(scheduled.map((n) => n.identifier));
  const wanted = new Set<string>();
  const now = Date.now();
  for (const task of tasks) {
    const id = `task-${task.id}`;
    const at = new Date(task.scheduled_at);
    if (!task.planActive || task.done_at || at.getTime() <= now) continue;
    wanted.add(id);
    if (existing.has(id)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body: task.title, data: { url: `/plan/${task.plan_id}` } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  }
  for (const n of scheduled) {
    if (n.identifier.startsWith('task-') && !wanted.has(n.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

/** Tipp auf eine Benachrichtigung öffnet den Deep Link (data.url). */
export function subscribeToNotificationTaps() {
  if (!supported) return () => undefined;
  const open = (data: unknown) => {
    const url = (data as { url?: unknown } | undefined)?.url;
    if (typeof url === 'string' && url.startsWith('/')) router.push(url as never);
  };
  const last = Notifications.getLastNotificationResponse();
  if (last) open(last.notification.request.content.data);
  const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
  return () => sub.remove();
}
