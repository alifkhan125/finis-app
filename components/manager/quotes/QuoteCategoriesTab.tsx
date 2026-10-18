import React, { useState } from "react";
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
  createQuoteWorkCategory,
  disableQuoteWorkCategory,
  getQuoteWorkCategories,
  updateQuoteWorkCategory,
  type QuoteWorkCategoryItem,
} from "@/api/manager/quotes.api";

export default function QuoteCategoriesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuoteWorkCategoryItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");

  const categoriesQuery = useQuery({
    queryKey: ["manager", "quotes", "work-categories", search],
    queryFn: () => getQuoteWorkCategories({ search: search.trim() || undefined, includeInactive: true }),
  });

  const categories: QuoteWorkCategoryItem[] = categoriesQuery.data || [];

  const createMutation = useMutation({
    mutationFn: createQuoteWorkCategory,
    onSuccess: () => {
      toast.success("Category created successfully!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create category");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuoteWorkCategoryItem> }) =>
      updateQuoteWorkCategory(id, data),
    onSuccess: () => {
      toast.success("Category updated successfully!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update category");
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableQuoteWorkCategory,
    onSuccess: () => {
      toast.success("Category status updated!");
      void queryClient.invalidateQueries({ queryKey: ["manager", "quotes"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to disable category");
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setSortOrder("0");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: QuoteWorkCategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setSortOrder(String(cat.sortOrder ?? 0));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }
    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
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
            Work Categories
          </Text>
          <Text className="mt-0.5 text-[12px] text-[#64748B]">
            Manage categories for your quote work items
          </Text>
        </View>
        <TouchableOpacity
          onPress={openCreateModal}
          className="flex-row items-center gap-1.5 rounded-[12px] bg-[#1F5577] px-3.5 py-2.5"
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text className="text-[13px] font-semibold text-white">
            Add Category
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="mb-4 flex-row items-center rounded-[12px] border border-[#CBD5E1] bg-white px-3.5 py-2">
        <Ionicons name="search" size={16} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search categories..."
          placeholderTextColor="#94A3B8"
          className="ml-2 flex-1 text-[13px] text-[#1E293B]"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories List */}
      {categoriesQuery.isLoading ? (
        <View className="items-center justify-center py-16">
          <ActivityIndicator size="large" color="#1F5577" />
          <Text className="mt-3 text-[14px] text-[#64748B]">Loading categories...</Text>
        </View>
      ) : categories.length === 0 ? (
        <View className="items-center justify-center rounded-[20px] border border-dashed border-[#CBD5E1] bg-white px-6 py-12">
          <Ionicons name="pricetags-outline" size={44} color="#94A3B8" />
          <Text className="mt-3 text-[16px] font-bold text-[#1F2937]">
            No Categories Found
          </Text>
          <Text className="mt-1 text-center text-[13px] text-[#64748B]">
            Add work categories to organize your quotation items library.
          </Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="mt-4 flex-row items-center gap-2 rounded-[12px] bg-[#1F5577] px-4 py-2.5"
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text className="text-[13px] font-semibold text-white">
              Create First Category
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={categories}
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
                  {item.description ? (
                    <Text className="mt-1 text-[13px] text-[#64748B]">
                      {item.description}
                    </Text>
                  ) : null}
                  <View className="mt-2 flex-row items-center gap-3">
                    <Text className="text-[11px] text-[#94A3B8]">
                      Sort Order: <Text className="font-semibold text-[#475569]">{item.sortOrder ?? 0}</Text>
                    </Text>
                    {item._count?.workItems !== undefined && (
                      <Text className="text-[11px] text-[#94A3B8]">
                        Items: <Text className="font-semibold text-[#1F5577]">{item._count.workItems}</Text>
                      </Text>
                    )}
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
          )}
        />
      )}

      {/* Add / Edit Category Modal */}
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
                {editingCategory ? "Edit Work Category" : "Add Work Category"}
              </Text>
              <Text className="mt-0.5 text-[12px] text-[#64748B]">
                Organize services and work items by category
              </Text>

              <View className="mt-4">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Category Name *
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Electrical, Carpentry, Flooring"
                  placeholderTextColor="#98A2B3"
                  className="h-[44px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[14px] text-[#1E293B]"
                />
              </View>

              <View className="mt-3">
                <Text className="mb-1.5 text-[12px] font-semibold text-[#475467]">
                  Description
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Category details..."
                  placeholderTextColor="#98A2B3"
                  multiline
                  numberOfLines={2}
                  className="min-h-[50px] rounded-[12px] border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-[13px] text-[#1E293B]"
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
                      {editingCategory ? "Update" : "Create"}
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
