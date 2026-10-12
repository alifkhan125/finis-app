import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { isAxiosError } from "axios";
import { logoutRequest } from "@/api/auth/auth.api";
import { useAuthMeQuery } from "@/hooks/auth/auth";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth.store";
import ProfileAvatar from "./ProfileAvatar";
import ProfileHeaderBar from "./ProfileHeaderBar";

function AdminMenuItem({ icon, label, route }: { icon: keyof typeof Ionicons.glyphMap; label: string; route: string }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(route as never)} className="mb-3 flex-row items-center justify-between rounded-[14px] border border-[#EDF1F5] bg-[#F8FAFC] px-4 py-4">
      <View className="flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D8F0FF]">
          <Ionicons name={icon} size={18} color="#1D5478" />
        </View>
        <Text className="ml-3 text-[16px] font-medium text-[#334155]">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { data: profile, refetch } = useAuthMeQuery();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const message = await logoutRequest();
            toast.success(message);
          } catch (error) {
            const message = isAxiosError(error) ? (error.response?.data?.message as string | undefined) : undefined;
            toast.error(message || "Logout API failed. Logged out locally.");
          } finally {
            queryClient.clear();
            clearSession();
            router.replace("/(auth)/login");
          }
        },
      },
    ]);
  };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const canOpenReport = isAdmin || profile?.role === "manager";
  const canOpenExpenses = isAdmin || profile?.role === "manager";

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-[#E9EDF1]">
      <ProfileHeaderBar title="" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1D5478" colors={["#1D5478"]} />}>
        <View className="items-center rounded-[24px] border border-[#E1E7ED] bg-white px-5 pb-5 pt-6">
          <ProfileAvatar uri={profile?.avatarUrl ?? ""} size={100} />
          <Text className="mt-4 text-[22px] font-semibold text-[#111827]">{profile?.fullName ?? "User"}</Text>
          <Text className="mt-1 text-[14px] text-[#64748B]">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Role"}</Text>

          <View className="mt-6 w-full">
            <Text className="mb-4 text-[16px] font-semibold text-[#111827]">Account Information</Text>

            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/screens/profile/personalinfo")} className="mb-3 flex-row items-center rounded-[14px] border border-[#EDF1F5] bg-[#F8FAFC] px-4 py-4">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D8F0FF]"><Ionicons name="person-outline" size={18} color="#1D5478" /></View>
              <Text className="ml-3 flex-1 text-[16px] font-medium text-[#334155]">Personal info</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/screens/profile/clientemailbox")} className="mb-3 flex-row items-center rounded-[14px] border border-[#EDF1F5] bg-[#F8FAFC] px-4 py-4">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D8F0FF]"><Ionicons name="mail-open-outline" size={18} color="#1D5478" /></View>
              <Text className="ml-3 flex-1 text-[16px] font-medium text-[#334155]">Client Email Box</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>

            {canOpenReport ? <AdminMenuItem icon="document-text-outline" label="Report" route="/screens/profile/report" /> : null}
            {canOpenExpenses ? <AdminMenuItem icon="receipt-outline" label="Expense" route="/screens/profile/expenses" /> : null}
            {isAdmin ? <AdminMenuItem icon="reader-outline" label="Quotation" route="/screens/profile/quotes" /> : null}
          </View>
        </View>

        {isAdmin ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/screens/profile/subscription")} className="mt-4 flex-row items-center justify-between rounded-[14px] border border-[#E1E7ED] bg-white px-4 py-4">
            <View className="flex-row items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D8F0FF]"><Ionicons name="card-outline" size={18} color="#1D5478" /></View>
              <Text className="ml-3 text-[16px] font-medium text-[#334155]">Subscription</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity activeOpacity={0.85} onPress={handleLogout} className="mt-3 flex-row items-center justify-between rounded-[14px] border border-[#F0D7DB] bg-white px-4 py-4">
          <View className="flex-row items-center">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-[#FFE4E6]"><Ionicons name="log-out-outline" size={18} color="#E11D48" /></View>
            <Text className="ml-3 text-[16px] font-medium text-[#334155]">Log Out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
