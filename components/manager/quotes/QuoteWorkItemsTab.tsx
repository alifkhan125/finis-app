import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import {
  createQuoteWorkItem,
  disableQuoteWorkItem,
  getQuoteMeasurementTypes,
  getQuoteWorkCategories,
  getQuoteWorkItems,
  updateQuoteWorkItem,
  type QuoteMeasurementTypeItem,
  type QuoteWorkCategoryItem,
  type QuoteWorkItemLookup,
} from "@/api/manager/quotes.api";

export default function QuoteWorkItemsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteWorkItemLookup | null>(null);

  // Form states
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formName, setFormName] = useState("");
  const [formMeasurementType, setFormMeasurementType] = useState("sqft");
  const [formUnitCost, setFormUnitCost] = useState("0");
  const [formProjectType, setFormProjectType] = useState("new_build");
  const [formPropertyType, setFormPropertyType] = useState("residential");
  const [formUnitType, setFormUnitType] = useState("apartment");
  const [formSortOrder, setFormSortOrder] = useState("0");

  const categoriesQuery = useQuery({
    queryKey: ["manager", "quotes", "work-categories"],
    queryFn: () => getQuoteWorkCategories({ includeInactive: true }),
  });

  const measurementsQuery = useQuery({
    queryKey: ["manager", "quotes", "measurement-types"],
    queryFn: () => getQuoteMeasurementTypes({ includeInactive: true }),
  });

  const workItemsQuery = useQuery({
    queryKey: ["manager", "quotes", "work-items-flat", search, selectedCategoryId],
    queryFn: async () => {
      const res = await getQuoteWorkItems({
        search: search.trim() || undefined,
        categoryId: selectedCategoryId === "all" ? undefined : selectedCategoryId,
        includeInactive: true,
        flat: true,
      });
      if (Array.isArray(res)) {
        if (res.length > 0 && "data" in res[0] && Array.isArray((res[0] as any).data)) {
          return (res as any).flatMap((group: any) =>
            (group.data || []).map((item: any) => ({
              ...item,
              category: item.category || group.category,
            })),
          );
        }
        return res as QuoteWorkItemLookup[];
      }
      return [] as QuoteWorkItemLookup[];
    },
  });

  const categories: QuoteWorkCategoryItem[] = categoriesQuery.data || [];
  const measurementTypes: QuoteMeasurementTypeItem[] = measurementsQuery.data || [];
  const workItems: QuoteWorkItemLookup[] = workItemsQuery.data || [];

  const createMutation = useMutation({
    mutationFn: createQuoteWorkItem,
    onSuccess: () => {
      toast.success("Work item added to library!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create work item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuoteWorkItemLookup> }) =>
      updateQuoteWorkItem(id, data as any),
    onSuccess: () => {
      toast.success("Work item updated!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update work item");
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableQuoteWorkItem,
    onSuccess: () => {
      toast.success("Work item status updated!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update status");
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setFormCategoryId(categories[0]?.id || "");
    setFormName("");
    setFormMeasurementType(measurementTypes[0]?.value || "sqft");
    setFormUnitCost("0");
    setFormProjectType("new_build");
    setFormPropertyType("residential");
    setFormUnitType("apartment");
    setFormSortOrder("0");
    setIsModalOpen(true);
  };

  const openEditModal = (item: QuoteWorkItemLookup) => {
    setEditingItem(item);
    setFormCategoryId(item.categoryId || item.category?.id || categories[0]?.id || "");
    setFormName(item.name);
    setFormMeasurementType(item.measurementType || measurementTypes[0]?.value || "sqft");
    setFormUnitCost(String(item.unitCost ?? 0));
    setFormProjectType(item.projectType || "new_build");
    setFormPropertyType(item.propertyType || "residential");
    setFormUnitType(item.unitType || "apartment");
    setFormSortOrder(String(item.sortOrder ?? 0));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Work item name is required");
      return;
    }
    if (!formCategoryId) {
      toast.error("Please select a category");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          name: formName.trim(),
          categoryId: formCategoryId,
          measurementType: formMeasurementType,
          unitCost: Number(formUnitCost) || 0,
          projectType: formProjectType,
          propertyType: formPropertyType,
          unitType: formUnitType,
          sortOrder: Number(formSortOrder) || 0,
        },
      });
    } else {
      createMutation.mutate({
        name: formName.trim(),
        categoryId: formCategoryId,
        measurementType: formMeasurementType,
        unitCost: Number(formUnitCost) || 0,
        projectType: formProjectType,
        propertyType: formPropertyType,
        unitType: formUnitType,
        sortOrder: Number(formSortOrder) || 0,
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
            Work Items Library
          </Text>
          <Text className="mt-0.5 text-[12px] text-[#64748B]">
            Master services catalog with standard rates & units
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreateModal}
          className="flex-row items-center gap-1.5 rounded-[12px] bg-[#1F5577] px-3.5 py-2.5"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text className="text-[13px] font-semibold text-white">
            Add Item
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="mb-3 flex-row items-center rounded-[12px] border border-[#CBD5E1] bg-white px-3.5 py-2">
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search work items..."
          placeholderTextColor="#94A3B8"
          className="ml-2 flex-1 text-[13px] text-[#1E293B]"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          contentContainerStyle={{ gap: 8 }}
        >
          <Pressable
            onPress={() => setSelectedCategoryId("all")}
            className={`rounded-full px-3.5 py-1.5 border ${
              selectedCategoryId === "all"
                ? "bg-[#1F5577] border-[#1F5577]"
                : "bg-white border-[#D7E0E8]"
            }`}
          >
            <Text
              className={`text-[12px] font-semibold ${
                selectedCategoryId === "all" ? "text-white" : "text-[#64748B]"
              }`}
            >
              All Categories
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                className={`rounded-full px-3.5 py-1.5 border ${
                  isSelected
                    ? "bg-[#1F5577] border-[#1F5577]"
                    : "bg-white border-[#D7E0E8]"
                }`}
              >
                <Text
                  className={`text-[12px] font-semibold ${
                    isSelected ? "text-white" : "text-[#64748B]"
                  }`}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Work Items List */}
      {workItemsQuery.isLoading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator size="large" color="#1F5577" />
          <Text className="mt-3 text-[14px] text-[#64748B]">Loading work items...</Text>
        </View>
      ) : workItems.length === 0 ? (
        <View className="items-center justify-center rounded-[20px] border border-dashed border-[#CBD5E1] bg-white px-6 py-12">
          <Ionicons name="layers-outline" size={44} color="#94A3B8" />
          <Text className="mt-3 text-[16px] font-bold text-[#1F2937]">
            No Work Items Found
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#64748B]">
            Add master work items to your catalog with standard pricing.
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="mt-4 flex-row items-center gap-2 rounded-[12px] bg-[#1F5577] px-4 py-2.5"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text className="text-[13px] font-semibold text-white">
              Create First Work Item
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workItems}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
          renderItem={({ item }) => (
            <View className="rounded-[16px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[16px] font-bold text-[#1E293B]">
                      {item.name}
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

                  {/* Category & Unit Tags */}
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    {item.category?.name && (
                      <View className="rounded-md bg-slate-100 px-2 py-0.5">
                        <Text className="text-[11px] font-medium text-slate-700">
                          {item.category.name}
                        </Text>
                      </View>
                    )}
                    <View className="rounded-md bg-blue-50 px-2 py-0.5">
                      <Text className="text-[11px] font-medium text-[#1F5577]">
                        Unit: {item.measurementType || "pcs"}
                      </Text>
                    </View>
                  </View>

                  {/* Price */}
                  <Text className="mt-2.5 text-[15px] font-bold text-[#1F5577]">
                    ${Number(item.unitCost || 0).toFixed(2)}{" "}
                    <Text className="text-[12px] font-normal text-[#64748B]">
                      / {item.measurementType || "unit"}
                    </Text>
                  </Text>
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
          )}
        />
      )}

      {/* Add / Edit Work Item Modal */}
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
              className="w-full max-w-[380px] max-h-[85%] rounded-[20px] bg-white p-5 shadow-2xl"
            >
              <Text className="text-[17px] font-bold text-[#1F2937]">
                {editingItem ? "Edit Work Item" : "Add Work Item to Catalog"}
              </Text>
              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                Define service item and base pricing
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                className="mt-4"
              >
                {/* Item Name */}
                <View className="mb-3">
                  <Text className="mb-1 text-[12px] font-semibold text-[#475467]">
                    Work Item Title *
                  </Text>
                  <TextInput
                    value={formName}
                    onChangeText={setFormName}
                    placeholder="e.g. Drywall Finishing"
                    placeholderTextColor="#98A2B3"
                    className="h-[44px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[14px] text-[#1E293B]"
                  />
                </View>

                {/* Category Select */}
                <View className="mb-3">
                  <Text className="mb-1 text-[12px] font-semibold text-[#475467]">
                    Category *
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {categories.map((cat) => {
                      const isSelected = formCategoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setFormCategoryId(cat.id)}
                          className={`rounded-lg px-3 py-1.5 border ${
                            isSelected
                              ? "bg-[#1F5577] border-[#1F5577]"
                              : "bg-white border-[#CBD5E1]"
                          }`}
                        >
                          <Text
                            className={`text-[12px] font-semibold ${
                              isSelected ? "text-white" : "text-[#475467]"
                            }`}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Measurement Unit */}
                <View className="mb-3">
                  <Text className="mb-1 text-[12px] font-semibold text-[#475467]">
                    Measurement Unit
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6 }}
                  >
                    {measurementTypes.map((mt) => {
                      const isSelected = formMeasurementType === mt.value;
                      return (
                        <TouchableOpacity
                          key={mt.value}
                          onPress={() => setFormMeasurementType(mt.value)}
                          className={`rounded-lg px-3 py-1.5 border ${
                            isSelected
                              ? "bg-[#1F5577] border-[#1F5577]"
                              : "bg-white border-[#CBD5E1]"
                          }`}
                        >
                          <Text
                            className={`text-[12px] font-semibold ${
                              isSelected ? "text-white" : "text-[#475467]"
                            }`}
                          >
                            {mt.label || mt.value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Unit Cost */}
                <View className="mb-3">
                  <Text className="mb-1 text-[12px] font-semibold text-[#475467]">
                    Base Unit Cost ($)
                  </Text>
                  <View className="h-[44px] flex-row items-center rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5">
                    <Text className="mr-1.5 text-[14px] text-[#98A2B3]">$</Text>
                    <TextInput
                      value={formUnitCost}
                      onChangeText={setFormUnitCost}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#98A2B3"
                      className="flex-1 text-[14px] text-[#1E293B]"
                    />
                  </View>
                </View>

                {/* Project Criteria */}
                <View className="mb-3">
                  <Text className="mb-1 text-[12px] font-semibold text-[#475467]">
                    Project Type
                  </Text>
                  <View className="flex-row gap-2">
                    {[
                      { value: "new_build", label: "New Build" },
                      { value: "renovation", label: "Renovation" },
                    ].map((pt) => (
                      <TouchableOpacity
                        key={pt.value}
                        onPress={() => setFormProjectType(pt.value)}
                        className={`flex-1 items-center justify-center rounded-lg py-2 border ${
                          formProjectType === pt.value
                            ? "bg-[#1F5577] border-[#1F5577]"
                            : "bg-white border-[#CBD5E1]"
                        }`}
                      >
                        <Text
                          className={`text-[12px] font-semibold ${
                            formProjectType === pt.value ? "text-white" : "text-[#475467]"
                          }`}
                        >
                          {pt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Buttons */}
                <View className="mt-4 flex-row gap-3 pb-2">
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
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
