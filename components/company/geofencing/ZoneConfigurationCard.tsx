import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import {
  useDeleteProjectGeofenceMutation,
  useUpdateProjectGeofenceMutation,
} from "@/hooks/company/company";

function MetricCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-[#EEF2F6] p-4">
      <Text className="text-[14px] text-[#6B7280]">{label}</Text>
      {children}
    </View>
  );
}

type ZoneConfigurationCardProps = {
  projectId?: string;
  geofenceId?: string;
  zoneName?: string;
  isActive?: boolean;
  definedAt?: string;
  totalAreaSqft?: number | null;
  perimeterFt?: number | null;
  centerPoint?: { lat: number; lng: number } | null;
  monitoringMode?: string;
  showActions?: boolean;
};

export default function ZoneConfigurationCard({
  projectId,
  geofenceId,
  zoneName,
  isActive,
  definedAt,
  totalAreaSqft,
  perimeterFt,
  centerPoint,
  monitoringMode,
  showActions = true,
}: ZoneConfigurationCardProps) {
  const updateGeofenceMutation = useUpdateProjectGeofenceMutation(projectId);
  const deleteGeofenceMutation = useDeleteProjectGeofenceMutation(projectId);

  const handleToggleActive = () => {
    if (!projectId || !geofenceId) {
      return;
    }

    void updateGeofenceMutation.mutateAsync({
      geofenceId,
      payload: { isActive: !isActive },
    });
  };

  const handleDelete = () => {
    if (!projectId || !geofenceId) {
      return;
    }

    Alert.alert("Delete zone?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteGeofenceMutation.mutateAsync(geofenceId),
      },
    ]);
  };

  return (
    <View className="mt-4 px-5">
      <View className="rounded-3xl border border-[#E2E8EE] bg-[#F7F9FB] p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1 pr-3">
            <Text
              className="text-[17px] font-semibold text-[#111827]"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {zoneName ?? "Zone"}
            </Text>
            <Text className="-mt-0.5 text-[17px] font-semibold text-[#111827]">
              Configuration
            </Text>
            <Text className="mt-2 text-[14px] text-[#6B7280]">
              {definedAt ? `Defined on ${definedAt}` : "Defined on —"}
            </Text>
          </View>

          <View className="max-w-[44%] items-end">
            <View
              className={`rounded-full px-3 py-2 ${isActive ? "bg-[#D8F2E3]" : "bg-[#E5E7EB]"}`}
            >
              <Text
                className={`text-[15px] ${isActive ? "text-[#16A34A]" : "text-[#6B7280]"}`}
              >
                {isActive ? "Active Monitor" : "Inactive"}
              </Text>
            </View>
            {showActions ? (
              <TouchableOpacity
                key="toggle-geofence-btn"
                activeOpacity={0.85}
                onPress={handleToggleActive}
                disabled={
                  !projectId ||
                  !geofenceId ||
                  updateGeofenceMutation.isPending ||
                  deleteGeofenceMutation.isPending
                }
                className="mt-2 h-10 flex-row items-center rounded-xl border border-[#CFD6DD] bg-[#F8FAFC] px-4"
              >
                <Ionicons
                  name={isActive ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#111827"
                />
                <Text className="ml-2 text-[16px] text-[#111827]">
                  {isActive ? "Disable" : "Enable"}
                </Text>
              </TouchableOpacity>
            ) : null}
            {showActions ? (
              <TouchableOpacity
                key="delete-geofence-btn"
                activeOpacity={0.85}
                onPress={handleDelete}
                disabled={
                  !projectId ||
                  !geofenceId ||
                  updateGeofenceMutation.isPending ||
                  deleteGeofenceMutation.isPending
                }
                className="mt-2 h-10 flex-row items-center rounded-xl border border-[#F3C6C6] bg-[#FFF7F7] px-4"
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text className="ml-2 text-[16px] text-[#DC2626]">Delete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <MetricCard label="Total Area">
            <Text className="text-[16px] font-semibold text-[#1F2937]">
              {typeof totalAreaSqft === "number"
                ? `${totalAreaSqft.toLocaleString()} sq.ft`
                : "—"}
            </Text>
          </MetricCard>
          <MetricCard label="Perimeter">
            <Text className="text-[16px] font-semibold text-[#1F2937]">
              {typeof perimeterFt === "number"
                ? `${perimeterFt.toLocaleString()} ft`
                : "—"}
            </Text>
          </MetricCard>
        </View>

        <View className="mt-3 flex-row gap-3">
          <MetricCard label="Center Point">
            {centerPoint ? (
              <>
                <Text className="text-[15px] leading-6 text-[#1F2937]">
                  {centerPoint.lat.toFixed(4)}°
                </Text>
                <Text className="-mt-0.5 text-[15px] leading-6 text-[#1F2937]">
                  {centerPoint.lng.toFixed(4)}°
                </Text>
              </>
            ) : (
              <Text className="text-[15px] leading-6 text-[#1F2937]">—</Text>
            )}
          </MetricCard>
          <MetricCard label="Monitoring Radius">
            <Text className="text-[15px] leading-6 text-[#1F2937]">
              {monitoringMode ?? "Precise"}
            </Text>
            <Text className="-mt-0.5 text-[15px] leading-6 text-[#1F2937]">
              Polygon
            </Text>
          </MetricCard>
        </View>
      </View>
    </View>
  );
}
