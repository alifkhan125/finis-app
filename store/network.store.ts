import { create } from "zustand";
import { AppState, type AppStateStatus } from "react-native";

export const pingInternet = async (timeoutMs = 3500): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Fast, lightweight 204 endpoint (standard Android connectivity test)
    const response = await fetch("https://clients3.google.com/generate_204", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.status >= 200 && response.status < 400;
  } catch {
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
      const res2 = await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        cache: "no-store",
        signal: controller2.signal,
      });
      clearTimeout(timeoutId2);
      return res2.status >= 200 && res2.status < 400;
    } catch {
      return false;
    }
  }
};

type NetworkState = {
  isConnected: boolean;
  isChecking: boolean;
  showOfflineModal: boolean;
  wasOffline: boolean;
  lastCheckedAt: number | null;
  setOffline: (offline: boolean) => void;
  setShowOfflineModal: (show: boolean) => void;
  clearWasOffline: () => void;
  checkConnection: () => Promise<boolean>;
};

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isConnected: true,
  isChecking: false,
  showOfflineModal: false,
  wasOffline: false,
  lastCheckedAt: null,

  setOffline: (offline: boolean) => {
    const current = get().isConnected;
    if (offline) {
      set({ isConnected: false, showOfflineModal: true });
    } else {
      const previouslyOffline = !current;
      set({
        isConnected: true,
        showOfflineModal: false,
        wasOffline: previouslyOffline,
      });
    }
  },

  setShowOfflineModal: (show: boolean) => {
    set({ showOfflineModal: show });
  },

  clearWasOffline: () => {
    set({ wasOffline: false });
  },

  checkConnection: async () => {
    set({ isChecking: true });
    const online = await pingInternet(3000);
    const wasPreviouslyOffline = !get().isConnected;

    if (online) {
      set({
        isConnected: true,
        isChecking: false,
        showOfflineModal: false,
        wasOffline: wasPreviouslyOffline,
        lastCheckedAt: Date.now(),
      });
    } else {
      set({
        isConnected: false,
        isChecking: false,
        showOfflineModal: true,
        lastCheckedAt: Date.now(),
      });
    }
    return online;
  },
}));

// Automatic background listener
let backgroundInterval: ReturnType<typeof setInterval> | null = null;

export const initNetworkListener = () => {
  // AppState change: when returning from device settings, verify connection
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === "active") {
      void useNetworkStore.getState().checkConnection();
    }
  };

  const subscription = AppState.addEventListener("change", handleAppStateChange);

  // Periodic check: checks every 20s if offline (to auto-recover) or 45s if online
  if (backgroundInterval) clearInterval(backgroundInterval);
  backgroundInterval = setInterval(() => {
    const { isConnected } = useNetworkStore.getState();
    // Prioritize checking if currently offline
    if (!isConnected) {
      void useNetworkStore.getState().checkConnection();
    }
  }, 15000);

  // Initial check on launch
  void useNetworkStore.getState().checkConnection();

  return () => {
    subscription.remove();
    if (backgroundInterval) clearInterval(backgroundInterval);
  };
};
