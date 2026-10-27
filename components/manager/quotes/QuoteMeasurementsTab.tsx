import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import {
  createQuoteMeasurementType,
  disableQuoteMeasurementType,
  getQuoteMeasurementTypes,
  updateQuoteMeasurementType,
  type QuoteMeasurementTypeItem,
} from "@/api/manager/quotes.api";

export default function QuoteMeasurementsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteMeasurementTypeItem | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const measurementsQuery = useQuery({
    queryKey: ["manager", "quotes", "measurement-types", search],
    queryFn: () => getQuoteMeasurementTypes({ search: search.trim() || undefined, includeInactive: true }),
  });

  const measurements: QuoteMeasurementTypeItem[] = measurementsQuery.data || [];

  const createMutation = useMutation({
    mutationFn: createQuoteMeasurementType,
    onSuccess: () => {
      toast.success("Measurement unit created successfully!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create measurement unit");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuoteMeasurementTypeItem> }) =>
      updateQuoteMeasurementType(id, data),
    onSuccess: () => {
      toast.success("Measurement unit updated successfully!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update measurement unit");
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableQuoteMeasurementType,
    onSuccess: () => {
      toast.success("Measurement unit status updated!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable measurement unit");
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setLabel("");
    setValue("");
    setSortOrder("0");
    setIsModalOpen(true);
  };

  const openEditModal = (item: QuoteMeasurementTypeItem) => {
    setEditingItem(item);
    setLabel(item.label);
    setValue(item.value);
    setSortOrder(String(item.sortOrder ?? 0));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Unit label is required (e.g. Square Feet)");
      return;
    }
    if (!value.trim()) {
      toast.error("Unit key/value is required (e.g. sqft)");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          label: label.trim(),
          value: value.trim().toLowerCase(),
          sortOrder: Number(sortOrder) || 0,
        },
      });
    } else {
      createMutation.mutate({
        label: label.trim(),
        value: value.trim().toLowerCase(),
        sortOrder: Number(sortOrder) || 0,
        isActive: true,
      });
    }
  };

  return (
    <View className="flex-1 mt-5 px-5">
      {/* Header and Add Button */}
      <View className="mb-4 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[18px] font-bold text-[#1F2937]">
            Measurement Units
          </Text>
          <Text className="mt-0.5 text-[12px] text-[#64748B]">
            Configure units of measurement (sqft, pcs, lm, etc.)
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreateModal}
          className="flex-row items-center gap-1.5 rounded-[12px] bg-[#1F5577] px-3.5 py-2.5"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text className="text-[13px] font-semibold text-white">
            Add Unit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="mb-4 flex-row items-center rounded-[12px] border border-[#CBD5E1] bg-white px-3.5 py-2">
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search measurement units..."
          placeholderTextColor="#94A3B8"
          className="ml-2 flex-1 text-[13px] text-[#1E293B]"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Measurements List */}
      {measurementsQuery.isLoading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator size="large" color="#1F5577" />
          <Text className="mt-3 text-[14px] text-[#64748B]">Loading measurement units...</Text>
        </View>
      ) : measurements.length === 0 ? (
        <View className="items-center justify-center rounded-[20px] border border-dashed border-[#CBD5E1] bg-white px-6 py-12">
          <Ionicons name="speedometer-outline" size={44} color="#94A3B8" />
          <Text className="mt-3 text-[16px] font-bold text-[#1F2937]">
            No Measurement Units Found
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#64748B]">
            Add custom measurement units for quotation tasks and pricing.
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="mt-4 flex-row items-center gap-2 rounded-[12px] bg-[#1F5577] px-4 py-2.5"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text className="text-[13px] font-semibold text-white">
              Create First Unit
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="gap-3 pb-10">
          {measurements.map((item) => (
            <View
              key={item.id}
              className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[16px] font-bold text-[#1E293B]">
                      {item.label}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-0.5 border ${
                        item.isActive
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold uppercase ${
                          item.isActive ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  <Text className="mt-1 text-[13px] text-[#64748B]">
                    Code / Key: <Text className="font-mono font-bold text-[#1F5577]">{item.value}</Text>
                  </Text>
                  <View className="mt-1.5 flex-row items-center gap-3">
                    <Text className="text-[11px] text-[#94A3B8]">
                      Sort Order: <Text className="font-semibold text-[#475569]">{item.sortOrder ?? 0}</Text>
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => openEditModal(item)}
                    className="h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white"
                  >
                    <Ionicons name="create-outline" size={16} color="#475569" />
                  </TouchableOpacity>
                  {item.isActive ? (
                    <TouchableOpacity
                      onPress={() => disableMutation.mutate(item.id)}
                      className="h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50"
                    >
                      <Ionicons name="ban-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        updateMutation.mutate({ id: item.id, data: { isActive: true } })
                      }
                      className="h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50"
                    >
                      <Ionicons name="checkmark-outline" size={16} color="#059669" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add / Edit Measurement Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Pressable
            className="flex-1 items-center justify-center bg-black/40 px-5"
            onPress={closeModal}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              className="w-full max-w-[370px] rounded-[20px] bg-white p-5 shadow-2xl"
            >
              <Text className="text-[17px] font-bold text-[#1F2937]">
                {editingItem ? "Edit Measurement Unit" : "Add Measurement Unit"}
              </Text>
              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                Define measurement unit name and value
              </Text>

              <View className="mt-4">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Label *
                </Text>
                <TextInput
                  value={label}
                  onChangeText={setLabel}
                  placeholder="e.g. Square Feet, Linear Meter, Piece"
                  placeholderTextColor="#98A2B3"
                  className="h-[44px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[14px] text-[#1E293B]"
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Value / Code *
                </Text>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. sqft, lm, pcs"
                  placeholderTextColor="#98A2B3"
                  autoCapitalize="none"
                  className="h-[44px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[14px] text-[#1E293B]"
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Sort Order
                </Text>
                <TextInput
                  value={sortOrder}
                  onChangeText={setSortOrder}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#98A2B3"
                  className="h-[44px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[14px] text-[#1E293B]"
                />
              </View>

              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  onPress={closeModal}
                  className="h-[44px] flex-1 items-center justify-center rounded-[12px] border border-[#D5DDE6] bg-white"
                >
                  <Text className="text-[14px] font-semibold text-[#344054]">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="h-[44px] flex-1 items-center justify-center rounded-[12px] bg-[#1F5577]"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-[14px] font-semibold text-white">
                      {editingItem ? "Update" : "Create"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
