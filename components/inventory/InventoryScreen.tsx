import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InventoryHeader from "./InventoryHeader";
import InventoryItemCard from "./InventoryItemCard";
import InventoryStatCard from "./InventoryStatCard";
import LowStockAlertsCard from "./LowStockAlertsCard";

import {
  useInventorySummaryQuery,
  useAllInventoryItemsQuery,
  useLowStockAlertsQuery,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
} from "@/hooks/inventory/inventory";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

export default function InventoryScreen() {
  const role = useAuthStore((state) => state.user?.role);
  const canManageInventory = role === "admin" || role === "manager";
  const canCreateInventory = canManageInventory || role === "worker";
  const { data: summary, refetch: refetchSummary } = useInventorySummaryQuery();
  const { data: alerts = [], isLoading: isLoadingAlerts, refetch: refetchAlerts } = useLowStockAlertsQuery();
  const { data: items = [], isLoading, refetch: refetchItems } = useAllInventoryItemsQuery();
  const { mutate: updateItem, isPending: isUpdating } = useUpdateInventoryMutation();
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteInventoryMutation();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([
      refetchSummary(),
      refetchAlerts(),
      refetchItems(),
      queryClient.invalidateQueries({ queryKey: ["inventory", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "all"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory", "low-stock"] }),
    ]);
  });

  const handleOpenUpdate = (itemId: string) => {
    router.push({
      pathname: "/screens/inventory/edit",
      params: { id: itemId }
    });
  };

  const handleDeleteItem = (itemId: string, projectId: string | undefined) => {
    if (!projectId) {
      Alert.alert("Error", "Project ID is missing for this item.");
      return;
    }

    Alert.alert(
      "Delete Inventory Item",
      "Are you sure you want to delete this item? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteItem({ projectId, itemId }),
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <InventoryHeader
          title="Inventory"
          onBack={() => router.back()}
          showAddButton={canCreateInventory}
          onPressAdd={() => router.push("/screens/inventory/add")}
        />

        <View className="mt-5 flex-row justify-between px-5">
          <InventoryStatCard
            value={String(summary?.totalProducts || 0)}
            label="Total Items"
          />
          <InventoryStatCard
            value={String(summary?.lowStockAlerts || 0)}
            label="Low Stock"
          />
        </View>

        <View className="mt-5 px-5">
          <Text className="text-[18px] font-medium text-[#111827]">
            Low Stock Alerts
          </Text>
          {isLoadingAlerts ? (
            <View className="mt-4 items-center justify-center">
              <Text className="text-[#697487]">Loading alerts...</Text>
            </View>
          ) : (
            <LowStockAlertsCard alerts={alerts} />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            className="mt-4 h-11 self-start rounded-full bg-[#1D5478] px-6"
          >
            <Text className="pt-2.5 text-[16px] font-medium text-white">
              All Items
            </Text>
          </TouchableOpacity>

          {isLoading ? (
            <View className="mt-8 items-center justify-center">
              <Text className="text-[#697487]">Loading items...</Text>
            </View>
          ) : (
            <View className="mt-2">
              {items.map((item) => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onPressUpdate={canManageInventory ? () => handleOpenUpdate(item.id) : undefined}
                  onPressDelete={canManageInventory ? () => handleDeleteItem(item.id, item.projectId) : undefined}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
