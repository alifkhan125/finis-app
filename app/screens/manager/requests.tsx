import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  usePendingTimeAdjustmentsQuery,
  useUpdateTimeAdjustmentStatusMutation,
} from "@/hooks/manager/time-adjustments";

const THEME = {
  colors: {
    background: "#F8FAFC",
    white: "#FFFFFF",
    textMain: "#0F172A",
    textSecondary: "#64748B",
    bluePrimary: "#1f3d5c",
    border: "#E2E8F0",
    green: "#22C55E",
    red: "#EF4444",
  },
};

export default function ManagerRequestsScreen() {
  const insets = useSafeAreaInsets();
  const { data: requests, isLoading, refetch } = usePendingTimeAdjustmentsQuery();
  const updateMutation = useUpdateTimeAdjustmentStatusMutation();

  const handleAction = (id: string, status: "approved" | "denied") => {
    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${status} this request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          style: status === "denied" ? "destructive" : "default",
          onPress: () => {
            updateMutation.mutate({ id, status });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.colors.background }} edges={['top','left','right']}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: THEME.colors.white,
          borderBottomWidth: 1,
          borderBottomColor: THEME.colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Feather name="arrow-left" size={24} color={THEME.colors.textMain} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: "700", color: THEME.colors.textMain }}>Pending Requests</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refetch()}
            tintColor={THEME.colors.bluePrimary}
            colors={[THEME.colors.bluePrimary]}
          />
        }
      >
        {isLoading && (!requests || (requests as any[]).length === 0) ? (
          <ActivityIndicator size="large" color={THEME.colors.bluePrimary} style={{ marginTop: 40 }} />
        ) : requests && (requests as any[]).length > 0 ? (
          (requests as any[]).map((req: any) => (
            <View
              key={req.id}
              style={{
                backgroundColor: THEME.colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: THEME.colors.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: THEME.colors.textMain }}>
                    {req.worker?.fullName || "Worker"}
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.colors.textSecondary }}>
                    {new Date(req.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={{ backgroundColor: "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#D97706", textTransform: 'capitalize' }}>
                    {req.requestType.replace('_', ' ')}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={THEME.colors.textSecondary} />
                <Text style={{ fontSize: 14, color: THEME.colors.textSecondary, marginLeft: 4, textDecorationLine: 'line-through' }}>
                  {new Date(req.originalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Feather name="arrow-right" size={16} color={THEME.colors.textSecondary} style={{ marginHorizontal: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.bluePrimary }}>
                  {new Date(req.adjustedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {req.reason && (
                <View style={{ backgroundColor: "#F1F5F9", padding: 10, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, color: THEME.colors.textMain }}>{`"${req.reason}"`}</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => handleAction(req.id, "denied")}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: THEME.colors.border, alignItems: 'center' }}
                  disabled={updateMutation.isPending}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.textMain }}>Deny</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAction(req.id, "approved")}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: THEME.colors.bluePrimary, alignItems: 'center' }}
                  disabled={updateMutation.isPending}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: THEME.colors.white }}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: "center", marginTop: 60 }}>
            <Feather name="inbox" size={48} color="#CBD5E1" />
            <Text style={{ fontSize: 16, color: THEME.colors.textSecondary, marginTop: 16 }}>No pending requests.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
