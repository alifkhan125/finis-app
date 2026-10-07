import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as IntentLauncher from "expo-intent-launcher";
import { useNetworkStore, initNetworkListener } from "@/store/network.store";

export default function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";

  const {
    isConnected,
    isChecking,
    showOfflineModal,
    wasOffline,
    setShowOfflineModal,
    checkConnection,
    clearWasOffline,
  } = useNetworkStore();

  const [stillOfflineNotice, setStillOfflineNotice] = useState(false);

  // Animations
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const onlineToastAnim = useRef(new Animated.Value(0)).current;

  // Initialize network listeners
  useEffect(() => {
    const cleanup = initNetworkListener();
    return () => cleanup();
  }, []);

  // Animate top banner when offline and modal is dismissed
  useEffect(() => {
    if (!isConnected && !showOfflineModal) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    } else {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, showOfflineModal, bannerAnim]);

  // Animate "Back Online" green toast when connection recovers
  useEffect(() => {
    if (wasOffline && isConnected) {
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch { }

      Animated.spring(onlineToastAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(onlineToastAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          clearWasOffline();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [wasOffline, isConnected, onlineToastAnim, clearWasOffline]);

  const handleRetry = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }
    setStillOfflineNotice(false);

    const online = await checkConnection();
    if (!online) {
      try {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch { }
      setStillOfflineNotice(true);
      setTimeout(() => setStillOfflineNotice(false), 4000);
    }
  };

  const handleOpenSettings = async () => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch { }

    if (Platform.OS === "android") {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.WIRELESS_SETTINGS
        );
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await Linking.openSettings();
    } catch (e) {
      console.warn("Could not open settings", e);
    }
  };

  return (
    <>
      {/* ─── 1. TOP FLOATING RECOVERED PILL ("Back Online") ─────────────── */}
      <Animated.View
        pointerEvents={wasOffline && isConnected ? "auto" : "none"}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 9999,
          transform: [
            {
              translateY: onlineToastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-80, 0],
              }),
            },
          ],
          opacity: onlineToastAnim,
        }}
      >
        <View className="flex-row items-center justify-between rounded-2xl bg-emerald-600 px-4 py-3 shadow-lg shadow-emerald-900/30">
          <View className="flex-row items-center gap-2.5">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500/40">
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text className="text-[14px] font-bold text-white">Back Online</Text>
              <Text className="text-[11px] text-emerald-100">
                Internet connection restored
              </Text>
            </View>
          </View>
          <View className="rounded-full bg-emerald-500/30 px-2.5 py-1">
            <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
              Connected
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ─── 2. TOP FLOATING OFFLINE PILL (when modal is dismissed) ─────── */}
      <Animated.View
        pointerEvents={!isConnected && !showOfflineModal ? "auto" : "none"}
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
          zIndex: 9998,
          transform: [
            {
              translateY: bannerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-80, 0],
              }),
            },
          ],
          opacity: bannerAnim,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowOfflineModal(true)}
          className="flex-row items-center justify-between rounded-2xl bg-slate-900/95 px-4 py-3 shadow-xl shadow-black/40 border border-slate-800"
        >
          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-rose-500/20">
              <Ionicons name="cloud-offline" size={17} color="#FB7185" />
            </View>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-white">
                No Internet Connection
              </Text>
              <Text className="text-[11px] text-slate-400 numberOfLines={1}">
                Check mobile data or Wi-Fi
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleRetry}
            disabled={isChecking}
            className="rounded-xl bg-slate-800 px-3 py-1.5 border border-slate-700 flex-row items-center gap-1.5"
          >
            {isChecking ? (
              <ActivityIndicator size="small" color="#60A5FA" />
            ) : (
              <>
                <Ionicons name="reload" size={12} color="#60A5FA" />
                <Text className="text-[11px] font-bold text-blue-400">Retry</Text>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 3. PROFESSIONAL FULL OFFLINE MODAL ─────────────────────────── */}
      <Modal
        visible={!isConnected && showOfflineModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/60 justify-end sm:justify-center items-center px-0 sm:px-6">
          <Pressable
            className="w-full rounded-t-[32px] sm:rounded-[32px] bg-white px-6 pt-4 border border-slate-100 shadow-2xl max-w-lg"
            style={{
              paddingBottom: isIOS
                ? Math.max(insets.bottom, 16) + 16
                : Math.max(insets.bottom, 24) + 20,
            }}
          >
            {/* Sheet Handle */}
            <View className="items-center mb-5">
              <View className="h-1.5 w-12 rounded-full bg-slate-200" />
            </View>

            {/* Hero Icon with Soft Pulse Aura */}
            <View className="items-center mb-4">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-rose-50 border-4 border-rose-100/60 shadow-sm">
                <View className="h-14 w-14 items-center justify-center rounded-full bg-rose-500/10">
                  <MaterialCommunityIcons
                    name="wifi-alert"
                    size={32}
                    color="#E11D48"
                  />
                </View>
              </View>

              {/* Status Pill */}
              <View className="mt-3 flex-row items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 border border-rose-200/60">
                <View className="h-2 w-2 rounded-full bg-rose-500" />
                <Text className="text-[11px] font-bold tracking-wider text-rose-700 uppercase">
                  Offline Mode
                </Text>
              </View>
            </View>

            {/* Headings */}
            <View className="items-center mb-6 px-2">
              <Text className="text-[20px] font-extrabold text-slate-900 text-center tracking-tight">
                No Internet Connection
              </Text>
              <Text className="mt-2 text-[14px] leading-[22px] text-slate-600 text-center font-medium">
                Mobile phone's internet is not working. Please check your mobile data or Wi-Fi and try again.
              </Text>
            </View>

            {/* Checklist Guide Card */}
            <View className="mb-6 rounded-2xl bg-slate-50 p-4 border border-slate-100 space-y-3">
              <View className="flex-row items-start gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-blue-100/70 shrink-0">
                  <Ionicons name="cellular-outline" size={18} color="#0284C7" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-slate-800">
                    Mobile Data
                  </Text>
                  <Text className="text-[12px] text-slate-500 leading-[16px]">
                    Make sure cellular data is switched ON and has active balance/coverage.
                  </Text>
                </View>
              </View>

              <View className="h-[1px] bg-slate-200/70" />

              <View className="flex-row items-start gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-indigo-100/70 shrink-0">
                  <Ionicons name="wifi-outline" size={18} color="#4F46E5" />
                </View>
                <View className="flex-1">
                  <Text className="text-[13px] font-bold text-slate-800">
                    Wi-Fi Network
                  </Text>
                  <Text className="text-[12px] text-slate-500 leading-[16px]">
                    Confirm your Wi-Fi is connected and has access to the internet.
                  </Text>
                </View>
              </View>
            </View>

            {/* Still offline warning notice if retry failed */}
            {stillOfflineNotice && (
              <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-amber-50 p-3 border border-amber-200">
                <Ionicons name="warning-outline" size={18} color="#D97706" />
                <Text className="text-[12px] font-semibold text-amber-800 flex-1">
                  Still offline. Please enable Wi-Fi or Mobile Data to reconnect.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="space-y-2.5">
              {/* Primary: Retry Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRetry}
                disabled={isChecking}
                className="h-13 flex-row items-center justify-center rounded-2xl bg-[#1D4F6D] py-3.5 shadow-md shadow-[#1D4F6D]/20"
              >
                {isChecking ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="ml-2 text-[15px] font-bold text-white">
                      Checking Connection...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="refresh" size={18} color="#FFFFFF" />
                    <Text className="ml-2 text-[15px] font-bold text-white">
                      Try Again
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Row: Settings & Dismiss */}
              <View className="flex-row gap-2.5 mt-1">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleOpenSettings}
                  className="flex-1 flex-row items-center justify-center rounded-2xl border border-slate-200 bg-white py-3"
                >
                  <Ionicons name="settings-outline" size={16} color="#475569" />
                  <Text className="ml-1.5 text-[13px] font-semibold text-slate-700">
                    Network Settings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowOfflineModal(false)}
                  className="flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white py-3"
                >
                  <Text className="text-[13px] font-semibold text-slate-600">
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
