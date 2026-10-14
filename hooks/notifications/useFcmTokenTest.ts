import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import { getApps } from "@react-native-firebase/app";
import { getMessaging, getToken, onMessage, onTokenRefresh, registerDeviceForRemoteMessages, requestPermission } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { saveDeviceToken } from "@/api/notifications/notifications.api";
import { useAuthStore } from "@/store/auth.store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function useFcmTokenTest() {
  const authToken = useAuthStore((state) => state.token);
  const pendingTokenRef = useRef<string | null>(null);

  useEffect(() => {

    let unsubscribeTokenRefresh: undefined | (() => void);
    let unsubscribeMessage: undefined | (() => void);

    if (Platform.OS === "android") {
      void Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F62FE",
      });
    }

    async function persistToken(token: string) {
    
      if (!authToken) {
        pendingTokenRef.current = token;
        return;
      }

      await saveDeviceToken({
        token,
        platform: "android",
      });
   
    }

    async function requestNotificationPermission() {
      const existingPermission = await Notifications.getPermissionsAsync();
      if (existingPermission.granted) {
        return true;
      }

      const requestedPermission = await Notifications.requestPermissionsAsync();
      return requestedPermission.granted;
    }

    async function initFCM() {
      try {
        if (!getApps().length) {
          return;
        }
        const messaging = getMessaging();
        await registerDeviceForRemoteMessages(messaging);
        await requestNotificationPermission();
        await requestPermission(messaging);

        const token = await getToken(messaging);
       
        await persistToken(token);

        unsubscribeTokenRefresh = onTokenRefresh(messaging, (nextToken) => {
     
          void persistToken(nextToken).then(() => {
            if (authToken) {
            }
          });
        });

        unsubscribeMessage = onMessage(messaging, async (remoteMessage) => {
          const title = remoteMessage.notification?.title ?? "Notification";
          const body = remoteMessage.notification?.body ?? "";

          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: remoteMessage.data,
              sound: "default",
              ...(Platform.OS === "android" ? { channelId: "default" } : {}),
            },
            trigger: null,
          });
   
        });
      } catch (error) {
        console.log("[FCM] init error:", error);
      }
    }

    void initFCM();

    if (authToken && pendingTokenRef.current) {
      void persistToken(pendingTokenRef.current);
      pendingTokenRef.current = null;
    }

    return () => {
      if (unsubscribeTokenRefresh) {
        unsubscribeTokenRefresh();
      }
      if (unsubscribeMessage) {
        unsubscribeMessage();
      }
    };
  }, [authToken]);
}
