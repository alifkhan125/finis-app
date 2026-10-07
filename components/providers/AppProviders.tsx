import { StripeProvider } from "@stripe/stripe-react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Toaster } from "sonner-native";
import OfflineNotice from "@/components/common/OfflineNotice";
import { useAuthMeQuery } from "@/hooks/auth/auth";
import { useFcmTokenTest } from "@/hooks/notifications/useFcmTokenTest";
import { useNotificationsSocket } from "@/lib/notifications-socket";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";

type AppProvidersProps = {
  children: ReactNode;
};

function AuthBootstrap() {
  useAuthMeQuery();
  useFcmTokenTest();
  useNotificationsSocket();

  return null;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const stripePublishableKey =
    process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey={stripePublishableKey}
        merchantIdentifier="merchant.com.anonymous.finis"
      >
        <QueryClientProvider client={queryClient}>
          <AuthBootstrap />
          {children}
          <Toaster />
          <OfflineNotice />
        </QueryClientProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}

