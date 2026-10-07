import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { toast, Toaster } from "sonner-native";
import {
  uploadExpenseReceipt,
  type ExpensePayload,
  type ReimbursementExpense,
} from "@/api/admin/expenses.api";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminExpenseOptionsQuery,
  useAdminExpenseProjectTasksQuery,
  useAdminExpenseProjectsQuery,
  useAdminExpenseSummaryQuery,
  useAdminExpensesQuery,
  useApproveAdminExpenseMutation,
  useCreateAdminExpenseMutation,
  useDeleteAdminExpenseMutation,
  useMarkAdminExpensePaidMutation,
  useRejectAdminExpenseMutation,
  useRequestRevisionAdminExpenseMutation,
  useSubmitAdminExpenseMutation,
  useUpdateAdminExpenseMutation,
} from "@/hooks/admin/expenses";
import { appendImageToFormData } from "@/lib/uploads/image-upload";
import { API_BASE_URL } from "@/lib/config";
import { useAuthStore } from "@/store/auth.store";

type ReceiptAsset = { uri: string; name?: string | null; type?: string | null };
type SelectorType = "project" | "task" | "currency" | "category" | "paymentMethod";
type OptionItem = { id: string; name: string; value: string; taskId?: string; subTaskId?: string | null; kind?: "task" | "subtask" };

const fallbackOptions = {
  currency: ["BDT", "USD", "CAD", "EUR", "GBP"],
  category: [
    "Travel",
    "Meals",
    "Hotel",
    "Fuel",
    "Office Supplies",
    "Equipment",
    "Software",
    "Subscriptions",
    "Training",
    "Marketing",
    "Construction Materials",
    "Vehicle Expenses",
    "Utilities",
    "Miscellaneous",
  ],
  paymentMethod: [
    "Cash",
    "Personal Card",
    "Corporate Card",
    "Bank Transfer",
    "Mobile Banking",
    "Other",
  ],
};
const emptyForm = {
  title: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  subtotal: "",
  tax: "",
  currency: "USD",
  category: "Travel",
  vendor: "",
  paymentMethod: "",
  projectId: "",
  taskId: "",
  subTaskId: "",
  notes: "",
};
function money(amount?: number, currency = "BDT") {
  return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
}
function getExpenseStatus(expense: { status: string; rejectionNote?: string | null }) {
  if (expense.status === "REVISION" || (expense.status === "DRAFT" && Boolean(expense.rejectionNote))) {
    return "REVISION";
  }
  return expense.status;
}
function statusColor(status: string) {
  return status === "PAID"
    ? "#16A34A"
    : status === "APPROVED"
      ? "#1D5478"
      : status === "REJECTED"
        ? "#DC2626"
        : status === "SUBMITTED"
          ? "#B45309"
          : "#64748B";
}
function appendText(
  formData: FormData,
  key: string,
  value?: string | number | null,
) {
  if (value !== undefined && value !== null && String(value).trim() !== "")
    formData.append(key, String(value));
}
function toOptions(values: string[]) {
  return values
    .filter(Boolean)
    .map((value, index) => ({ id: `${value}-${index}`, name: value, value }));
}
function mergeValues(primary?: string[], fallback: string[] = []) {
  const map = new Map<string, string>();
  [...fallback, ...(primary ?? [])].forEach((item) => {
    const value = item.trim();
    if (value && !map.has(value.toLowerCase()))
      map.set(value.toLowerCase(), value);
  });
  return [...map.values()];
}
function resolveReceiptUrl(url?: string | null) {
  if (!url) return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://")
  )
    return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}
function isImageReceipt(url?: string | null) {
  return !!url && !/\.pdf(\?|#|$)/i.test(url);
}
function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <View className="rounded-[12px] bg-[#F8FAFC] px-4 py-3">
      <Text className="text-[12px] text-[#64748B]">{label}</Text>
      <Text className="mt-1 text-[14px] font-semibold text-[#111827]">
        {value || "N/A"}
      </Text>
    </View>
  );
}

function SelectorField({
  label,
  value,
  placeholder,
  onPress,
  required,
}: {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  required?: boolean;
}) {
  return (
    <View>
      <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">
        {label}
        {required && <Text className="text-red-500"> *</Text>}
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        className="h-[48px] flex-row items-center justify-between rounded-[12px] border border-[#E5EAF0] bg-white px-4"
      >
        <Text
          className={`text-[14px] ${value ? "text-[#111827]" : "text-[#94A3B8]"}`}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748B" />
      </TouchableOpacity>
    </View>
  );
}

function SelectorSheet({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedValue: string;
  onSelect: (item: OptionItem) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const closeSheet = () => {
    Keyboard.dismiss();
    setSearchQuery("");
    onClose();
  };

  const handleAdd = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    onSelect({
      id: `custom-${trimmed.toLowerCase()}`,
      name: trimmed,
      value: trimmed,
    });
    closeSheet();
  };

  const filteredOptions = options.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showCreateOption =
    title !== "Project" &&
    title !== "Task" &&
    searchQuery.trim().length > 0 &&
    !filteredOptions.some(
      (item) => item.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={closeSheet}
        >
          <Pressable
            className="max-h-[70%] rounded-t-[24px] bg-white p-5"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-[#141A22]">Select {title}</Text>
              <TouchableOpacity onPress={closeSheet}>
                <Ionicons name="close" size={24} color="#697487" />
              </TouchableOpacity>
            </View>

            <View className="mb-4 flex-row items-center rounded-[12px] border border-[#D8DEE5] bg-[#F7F9FB] px-3">
              <Ionicons name="search" size={20} color="#8B949C" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={`Search ${title.toLowerCase()}...`}
                placeholderTextColor="#8B949C"
                className="h-[46px] flex-1 ml-2 text-[15px] text-[#141A22]"
                returnKeyType="done"
              />
            </View>

            <View>
              <FlatList
                data={filteredOptions}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0, maxHeight: 300 }}
                contentContainerStyle={{ paddingTop: 4, paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => {
                      onSelect(item);
                      closeSheet();
                    }}
                    className={`mb-3 min-h-[52px] flex-row items-center justify-between rounded-[12px] border px-4 py-3 ${selectedValue === item.value
                      ? "border-[#2662F4] bg-[#F0F4FF]"
                      : "border-[#D8DEE5] bg-[#F7F9FB]"
                      }`}
                  >
                    <Text className="flex-1 pr-3 text-[15px] font-medium text-[#141A22]">{item.name}</Text>
                    {selectedValue === item.value ? (
                      <Ionicons name="checkmark-circle" size={20} color="#2662F4" />
                    ) : null}
                  </TouchableOpacity>
                )}
                ListFooterComponent={
                  showCreateOption ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleAdd(searchQuery)}
                      className="mb-3 min-h-[52px] flex-row items-center justify-center rounded-[12px] border border-dashed border-[#1F506D] bg-[#F3F8FB]"
                    >
                      <Ionicons name="add" size={20} color="#1F506D" />
                      <Text className="ml-2 text-[14px] font-semibold text-[#1F506D]">
                        Create &quot;{searchQuery.trim()}&quot;
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
                ListEmptyComponent={
                  !showCreateOption ? (
                    <Text className="py-6 text-center text-[14px] text-[#697487]">
                      No {title.toLowerCase()} found.
                    </Text>
                  ) : null
                }
              />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function AdminExpensesScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const canReviewExpenses =
    role === "admin" || role === "super_admin" || role === "manager";
  const canCreateExpenses =
    role === "admin" ||
    role === "super_admin" ||
    role === "manager" ||
    role === "worker";
  const canMarkExpensePaid = role === "admin" || role === "super_admin";
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReimbursementExpense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [receipt, setReceipt] = useState<ReceiptAsset | null>(null);
  const [activeSelector, setActiveSelector] = useState<SelectorType | null>(
    null,
  );
  const [selectorSearch, setSelectorSearch] = useState("");
  const [savingAction, setSavingAction] = useState<
    "DRAFT" | "SUBMITTED" | null
  >(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const calculatedTotal = useMemo(() => {
    const sub = parseFloat(form.subtotal) || 0;
    const t = parseFloat(form.tax) || 0;
    return (sub + t).toFixed(2);
  }, [form.subtotal, form.tax]);
  
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setForm((f) => ({ ...f, expenseDate: formattedDate }));
    }
  };
  const [selectedExpense, setSelectedExpense] =
    useState<ReimbursementExpense | null>(null);
  const list = useAdminExpensesQuery({ page: 1, limit: 50 });
  const summary = useAdminExpenseSummaryQuery();
  const optionQuery = useAdminExpenseOptionsQuery();
  const projectsQuery = useAdminExpenseProjectsQuery();
  const tasksQuery = useAdminExpenseProjectTasksQuery(form.projectId);
  const createMutation = useCreateAdminExpenseMutation();
  const updateMutation = useUpdateAdminExpenseMutation();
  const deleteMutation = useDeleteAdminExpenseMutation();
  const submitMutation = useSubmitAdminExpenseMutation();
  const approveMutation = useApproveAdminExpenseMutation();
  const rejectMutation = useRejectAdminExpenseMutation();
  const requestRevisionMutation = useRequestRevisionAdminExpenseMutation();
  const paidMutation = useMarkAdminExpensePaidMutation();
  const queryClient = useQueryClient();
  const [uploadingReceiptIds, setUploadingReceiptIds] = useState<Record<string, ReceiptAsset>>({});
  const [failedReceiptIds, setFailedReceiptIds] = useState<Record<string, ReceiptAsset>>({});

  const uploadReceiptInBackground = async (
    expenseId: string,
    expenseTitle: string,
    asset: ReceiptAsset
  ) => {
    setUploadingReceiptIds((prev) => ({ ...prev, [expenseId]: asset }));
    setFailedReceiptIds((prev) => {
      const next = { ...prev };
      delete next[expenseId];
      return next;
    });

    try {
      await uploadExpenseReceipt(expenseId, asset);
      setUploadingReceiptIds((prev) => {
        const next = { ...prev };
        delete next[expenseId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "expenses"] });
      toast.success(`Receipt uploaded for "${expenseTitle}"`);
    } catch {
      setUploadingReceiptIds((prev) => {
        const next = { ...prev };
        delete next[expenseId];
        return next;
      });
      setFailedReceiptIds((prev) => ({ ...prev, [expenseId]: asset }));
      toast.error(
        `Receipt upload failed for "${expenseTitle}". Tap card to retry.`
      );
    }
  };

  const retryReceiptUpload = (expenseId: string, expenseTitle: string) => {
    const asset = failedReceiptIds[expenseId];
    if (asset) {
      uploadReceiptInBackground(expenseId, expenseTitle, asset);
    }
  };
  const expenses = list.data?.data ?? [];
  const refreshing =
    list.isRefetching ||
    summary.isRefetching ||
    optionQuery.isRefetching ||
    projectsQuery.isRefetching;
  const busy =
    savingAction !== null ||
    createMutation.isPending ||
    updateMutation.isPending ||
    requestRevisionMutation.isPending;
  const stats = summary.data ?? {
    totalExpenses: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    totalAmountThisMonth: 0,
  };
  const options = {
    currency: mergeValues(optionQuery.data?.currency, fallbackOptions.currency),
    category: mergeValues(optionQuery.data?.category, fallbackOptions.category),
    paymentMethod: mergeValues(
      optionQuery.data?.paymentMethod,
      fallbackOptions.paymentMethod,
    ),
  };
  const statCards = useMemo(
    () => [
      ["Total", stats.totalExpenses],
      ["Draft", stats.draft],
      ["Submitted", stats.submitted],
      ["Approved", stats.approved],
      ["Rejected", stats.rejected],
      ["Paid", stats.paid],
      ["Revision", stats.revision ?? 0],
      ["This Month", money(stats.totalAmountThisMonth)],
    ],
    [stats],
  );

  const pickReceipt = async (source: "camera" | "gallery") => {
    const ImagePicker = await import("expo-image-picker");
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        source === "camera"
          ? "Allow camera access to capture receipt."
          : "Allow photo access to choose receipt.",
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.5,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.5,
          });
    if (!result.canceled && result.assets[0]?.uri) {
      const asset = result.assets[0];
      setReceipt({
        uri: asset.uri,
        name: asset.fileName ?? "receipt.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
    }
  };

  if (
    role !== "admin" &&
    role !== "super_admin" &&
    role !== "manager" &&
    role !== "worker"
  )
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#E9EDF1]">
        <Ionicons name="lock-closed-outline" size={28} color="#94A3B8" />
        <Text className="mt-3 text-[#64748B]">
          Expense Management is only available to admins.
        </Text>
      </SafeAreaView>
    );
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setReceipt(null);
    setModalOpen(true);
  };
  const openEdit = (expense: ReimbursementExpense) => {
    setEditing(expense);
    setReceipt(null);
    setForm({
      title: expense.title,
      expenseDate: expense.expenseDate.slice(0, 10),
      subtotal: expense.subtotal !== undefined ? String(expense.subtotal) : String(expense.amount ?? ""),
      tax: expense.tax !== undefined ? String(expense.tax) : "0",
      currency: expense.currency,
      category: expense.category,
      vendor: expense.vendor ?? "",
      paymentMethod: expense.paymentMethod ?? "",
      projectId: expense.projectId ?? "",
      taskId: expense.taskId ?? "",
      subTaskId: expense.subTaskId ?? "",
      notes: expense.notes ?? "",
    });
    setModalOpen(true);
  };
  const openSelector = (type: SelectorType) => {
    setSelectorSearch(
      type === "project"
        ? selectedProjectName
        : type === "task"
        ? selectedTaskName
        : form[type]
    );
    setActiveSelector(type);
  };
  const selectOption = (item: OptionItem) => {
    if (!activeSelector) return;
    setForm((f) => {
      const nextForm = {
        ...f,
        [activeSelector === "project" ? "projectId" : activeSelector === "task" ? "taskId" : activeSelector]: item.value,
      };
      if (activeSelector === "task") {
        nextForm.taskId = item.taskId ?? item.value;
        nextForm.subTaskId = item.subTaskId ?? "";
      }
      // Reset task if project changes
      if (activeSelector === "project" && f.projectId !== item.value) {
        nextForm.taskId = "";
        nextForm.subTaskId = "";
      }
      return nextForm;
    });
    setSelectorSearch(item.name);
    setActiveSelector(null);
  };
  const save = async (action: "DRAFT" | "SUBMITTED") => {
    if (busy) return;
    if (
      !form.title.trim() ||
      !form.expenseDate ||
      form.subtotal === "" ||
      form.tax === "" ||
      !form.currency.trim() ||
      !form.category.trim() ||
      !form.projectId.trim() ||
      !form.paymentMethod.trim() ||
      (!receipt && !editing?.receiptUrl)
    ) {
      toast.error(
        "Please fill all required fields including Subtotal, Tax, and Receipt"
      );
      return;
    }

    setSavingAction(action);
    try {
      const subtotalNum = parseFloat(form.subtotal) || 0;
      const taxNum = parseFloat(form.tax) || 0;
      const totalAmountNum = parseFloat((subtotalNum + taxNum).toFixed(2));

      const textPayload: ExpensePayload = {
        title: form.title.trim(),
        expenseDate: form.expenseDate,
        subtotal: subtotalNum,
        tax: taxNum,
        totalAmount: totalAmountNum,
        currency: form.currency.trim(),
        category: form.category.trim(),
        vendor: form.vendor.trim() || undefined,
        paymentMethod: form.paymentMethod.trim(),
        projectId: form.projectId.trim(),
        taskId: form.taskId.trim() || undefined,
        subTaskId: form.subTaskId.trim() || undefined,
        notes: form.notes.trim() || undefined,
        action,
      };

      const receiptToUpload = receipt;
      const expenseTitle = form.title.trim();

      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: textPayload });
        if (action === "SUBMITTED" && (editing.status === "DRAFT" || editing.status === "REVISION")) {
          await submitMutation.mutateAsync(editing.id);
        }
        setModalOpen(false);
        toast.success("Expense updated successfully");
        if (receiptToUpload) {
          uploadReceiptInBackground(editing.id, expenseTitle, receiptToUpload);
        }
      } else {
        const created = (await createMutation.mutateAsync(textPayload)) as any;
        const createdId = created?.id || created?.data?.id;
        setModalOpen(false);
        toast.success(
          action === "SUBMITTED"
            ? "Expense submitted! Receipt uploading in background..."
            : "Expense saved as draft! Receipt uploading in background..."
        );
        if (receiptToUpload && createdId) {
          uploadReceiptInBackground(createdId, expenseTitle, receiptToUpload);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Expense submit failed"
      );
    } finally {
      setSavingAction(null);
    }
  };
  const confirmDelete = (id: string) =>
    Alert.alert("Delete expense", "Delete this draft expense?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  const selectorTitle =
    activeSelector === "project"
      ? "Project"
      : activeSelector === "task"
        ? "Task"
      : activeSelector === "currency"
        ? "Currency"
        : activeSelector === "category"
          ? "Category"
          : "Payment Method";
  const projectOptions = (projectsQuery.data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    value: project.id,
  }));
  const taskOptions = (tasksQuery.data ?? []).map((task) => ({
    id: task.id,
    name: `${task.type === "subtask" ? "Subtask: " : "Task: "}${task.title}`,
    value: task.subTaskId ?? task.taskId,
    taskId: task.taskId,
    subTaskId: task.subTaskId ?? "",
    kind: task.type,
  }));
  const selectedProjectName =
    projectOptions.find((project) => project.value === form.projectId)?.name ??
    "";
  const selectedTaskName =
    taskOptions.find((task) => task.taskId === form.taskId && (task.subTaskId ?? "") === form.subTaskId)?.name ??
    taskOptions.find((task) => task.value === form.taskId)?.name ??
    "";
  const selectorOptions =
    activeSelector === "project"
      ? projectOptions
      : activeSelector === "task"
        ? taskOptions
      : toOptions(activeSelector ? options[activeSelector] : []);
  const selectedReceiptUrl = resolveReceiptUrl(selectedExpense?.receiptUrl);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-[#E9EDF1]"
    >
      <View className="flex-row items-center px-5 pt-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-8 w-8 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-center text-[18px] font-semibold text-[#111827]">
            Expense Management
          </Text>
          <Text className="text-center text-[12px] text-[#64748B]">
            Create and manage company expenses
          </Text>
        </View>
        {canCreateExpenses ? (
          <TouchableOpacity
            onPress={openCreate}
            className="h-8 w-8 items-center justify-center rounded-full bg-[#1D5478]"
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="h-8 w-8" />
        )}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 44 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              list.refetch();
              summary.refetch();
              optionQuery.refetch();
              projectsQuery.refetch();
            }}
            colors={["#1D5478"]}
          />
        }
      >
        <View className="flex-row flex-wrap gap-3">
          {statCards.map(([label, value]) => (
            <View
              key={String(label)}
              className="min-w-[30%] flex-1 rounded-[14px] bg-white p-4"
            >
              <Text className="text-[12px] text-[#64748B]">{label}</Text>
              <Text className="mt-1 text-[18px] font-semibold text-[#111827]">
                {value}
              </Text>
            </View>
          ))}
        </View>
        {list.isLoading ? (
          <ActivityIndicator className="mt-10" color="#1D5478" />
        ) : list.isError ? (
          <Text className="mt-10 text-center text-[#DC2626]">
            Failed to load expenses.
          </Text>
        ) : expenses.length === 0 ? (
          <View className="mt-10 items-center">
            <Ionicons name="receipt-outline" size={30} color="#94A3B8" />
            <Text className="mt-2 text-[#64748B]">No expenses yet.</Text>
          </View>
        ) : (
          <View className="mt-5 gap-3">
            {expenses.map((e) => (
              <View key={e.id} className="rounded-[16px] bg-white p-4">
                <View className="flex-row items-start">
                  <View className="flex-1">
                    <Text className="text-[16px] font-semibold text-[#111827]">
                      {e.title}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#64748B]">
                      {new Date(e.expenseDate).toLocaleDateString()} -{" "}
                      {e.category}
                    </Text>
                    <Text className="mt-1 text-[13px] text-[#64748B]">
                      {e.vendor || "No vendor"} -{" "}
                      {e.paymentMethod || "No method"}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[16px] font-bold text-[#111827]">
                      {money(e.totalAmount ?? e.amount, e.currency)}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-[#64748B]">
                      Sub: {money(e.subtotal, e.currency)} | Tax: {money(e.tax, e.currency)}
                    </Text>
                    <Text
                      style={{ color: statusColor(getExpenseStatus(e)) }}
                      className="mt-1 text-[12px] font-semibold"
                    >
                      {getExpenseStatus(e)}
                    </Text>
                  </View>
                </View>
                {e.rejectionNote ? (
                  <View className="mt-2.5 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-2.5">
                    <Text className="text-[11px] font-bold text-[#EA580C]">
                      Revision Reason:
                    </Text>
                    <Text className="mt-0.5 text-[12px] text-[#9A3412]">
                      {e.rejectionNote}
                    </Text>
                  </View>
                ) : null}
                {uploadingReceiptIds[e.id] ? (
                  <View className="mt-2 flex-row items-center gap-1.5 rounded-lg bg-[#EAF3FA] px-2.5 py-1.5">
                    <ActivityIndicator size="small" color="#1D5478" />
                    <Text className="text-[12px] font-medium text-[#1D5478]">
                      Uploading receipt in background...
                    </Text>
                  </View>
                ) : failedReceiptIds[e.id] ? (
                  <TouchableOpacity
                    onPress={() => retryReceiptUpload(e.id, e.title)}
                    className="mt-2 flex-row items-center justify-between rounded-lg bg-[#FEE2E2] px-2.5 py-1.5"
                  >
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="alert-circle" size={14} color="#DC2626" />
                      <Text className="text-[12px] font-medium text-[#DC2626]">
                        Receipt upload failed
                      </Text>
                    </View>
                    <Text className="text-[12px] font-bold text-[#DC2626] underline">
                      Tap to retry
                    </Text>
                  </TouchableOpacity>
                ) : e.receiptUrl ? (
                  <View className="mt-2 flex-row items-center gap-1">
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text className="text-[12px] font-medium text-[#16A34A]">
                      Receipt uploaded
                    </Text>
                  </View>
                ) : null}
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => setSelectedExpense(e)}
                    className="rounded-full bg-[#EEF2F6] px-3 py-2"
                  >
                    <Text className="text-[12px] font-semibold text-[#334155]">
                      View
                    </Text>
                  </TouchableOpacity>
                  {canCreateExpenses && ["DRAFT", "SUBMITTED", "REJECTED", "REVISION"].includes(e.status) ? (
                    <TouchableOpacity
                      onPress={() => openEdit(e)}
                      className="rounded-full bg-[#EAF3FA] px-3 py-2"
                    >
                      <Text className="text-[12px] font-semibold text-[#1D5478]">
                        Edit
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {canCreateExpenses && (e.status === "DRAFT" || e.status === "REVISION") ? (
                    <>
                      <TouchableOpacity
                        onPress={() => submitMutation.mutate(e.id)}
                        className="rounded-full bg-[#1D5478] px-3 py-2"
                      >
                        <Text className="text-[12px] font-semibold text-white">
                          {e.status === "REVISION" ? "Resubmit" : "Submit"}
                        </Text>
                      </TouchableOpacity>
                      {e.status === "DRAFT" ? (
                        <TouchableOpacity
                          onPress={() => confirmDelete(e.id)}
                          className="rounded-full bg-[#FEE2E2] px-3 py-2"
                        >
                          <Text className="text-[12px] font-semibold text-[#DC2626]">
                            Delete
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : null}
                  {canReviewExpenses && e.status === "SUBMITTED" ? (
                    <>
                      <TouchableOpacity
                        onPress={() => approveMutation.mutate(e.id)}
                        className="rounded-full bg-[#DCFCE7] px-3 py-2"
                      >
                        <Text className="text-[12px] font-semibold text-[#166534]">
                          Approve
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            "Reject Expense",
                            "Are you sure you want to permanently reject this expense? There will be no option to revise it later.",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Reject", style: "destructive", onPress: () => rejectMutation.mutate({ id: e.id }) }
                            ]
                          );
                        }}
                        className="rounded-full bg-[#FEE2E2] px-3 py-2"
                      >
                        <Text className="text-[12px] font-semibold text-[#DC2626]">
                          Reject
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => requestRevisionMutation.mutate({ id: e.id })}
                        className="rounded-full border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 ml-2"
                      >
                        <Text className="text-[12px] font-semibold text-[#EA580C]">
                          Revision
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                  {canMarkExpensePaid && e.status === "APPROVED" ? (
                    <TouchableOpacity
                      onPress={() => paidMutation.mutate(e.id)}
                      className="rounded-full bg-[#DCFCE7] px-3 py-2"
                    >
                      <Text className="text-[12px] font-semibold text-[#166534]">
                        Mark Paid
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            className="flex-1"
          >
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="ml-4 text-[18px] font-semibold text-[#111827]">
              {editing ? "Edit Expense" : "Add Expense"}
            </Text>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 12 }}
          >
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">
                Expense Title<Text className="text-red-500"> *</Text>
              </Text>
              <TextInput
                value={form.title}
                onChangeText={(title) => setForm((f) => ({ ...f, title }))}
                placeholder="Expense Title"
                className="rounded-[12px] border border-[#E5EAF0] px-4 py-3"
              />
            </View>
            <SelectorField
              label="Expense Date"
              value={form.expenseDate}
              placeholder="YYYY-MM-DD"
              onPress={() => setShowDatePicker(true)}
              required
            />
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">
                Subtotal<Text className="text-red-500"> *</Text>
              </Text>
              <TextInput
                value={form.subtotal}
                onChangeText={(subtotal) => setForm((f) => ({ ...f, subtotal }))}
                keyboardType="decimal-pad"
                placeholder="Subtotal (e.g. 30)"
                className="rounded-[12px] border border-[#E5EAF0] px-4 py-3"
              />
            </View>
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">
                Tax<Text className="text-red-500"> *</Text>
              </Text>
              <TextInput
                value={form.tax}
                onChangeText={(tax) => setForm((f) => ({ ...f, tax }))}
                keyboardType="decimal-pad"
                placeholder="Tax (e.g. 10)"
                className="rounded-[12px] border border-[#E5EAF0] px-4 py-3"
              />
            </View>
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">
                Total Amount (Auto Calculated)
              </Text>
              <TextInput
                value={calculatedTotal}
                editable={false}
                className="rounded-[12px] border border-[#E5EAF0] bg-[#F1F5F9] px-4 py-3 font-semibold text-[#1D5478]"
              />
            </View>
            <SelectorField
              label="Project"
              value={selectedProjectName}
              placeholder="Select project"
              onPress={() => openSelector("project")}
              required
            />
            {form.projectId ? (
              <SelectorField
                label="Task (Optional)"
                value={selectedTaskName}
                placeholder="Select task (optional)"
                onPress={() => openSelector("task")}
              />
            ) : null}
            <SelectorField
              label="Currency"
              value={form.currency}
              placeholder="Select or type currency"
              onPress={() => openSelector("currency")}
              required
            />
            <SelectorField
              label="Category"
              value={form.category}
              placeholder="Select or type category"
              onPress={() => openSelector("category")}
              required
            />
            <SelectorField
              label="Payment Method"
              value={form.paymentMethod}
              placeholder="Select or type payment method"
              onPress={() => openSelector("paymentMethod")}
              required
            />
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">Vendor</Text>
              <TextInput
                value={form.vendor}
                onChangeText={(vendor) => setForm((f) => ({ ...f, vendor }))}
                placeholder="Vendor"
                className="rounded-[12px] border border-[#E5EAF0] px-4 py-3"
              />
            </View>
            <View>
              <Text className="mb-2 text-[12px] font-semibold text-[#64748B]">Notes</Text>
              <TextInput
                value={form.notes}
                onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
                placeholder="Notes"
                multiline
                className="min-h-[48px] max-h-[90px] rounded-[12px] border border-[#E5EAF0] px-4 py-3"
              />
            </View>
            <Text className="text-[12px] font-semibold text-[#64748B]">
              Receipt<Text className="text-red-500"> *</Text>
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => pickReceipt("camera")}
                className="h-[44px] flex-1 flex-row items-center justify-center rounded-[12px] bg-[#EAF3FA]"
              >
                <Ionicons name="camera-outline" size={17} color="#1D5478" />
                <Text className="ml-2 font-semibold text-[#1D5478]">
                  Camera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => pickReceipt("gallery")}
                className="h-[44px] flex-1 flex-row items-center justify-center rounded-[12px] bg-[#EAF3FA]"
              >
                <Ionicons name="image-outline" size={17} color="#1D5478" />
                <Text className="ml-2 font-semibold text-[#1D5478]">
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
            {receipt ? (
              <TouchableOpacity
                onPress={() => setReceipt(null)}
                className="overflow-hidden rounded-[12px] border border-[#E5EAF0]"
              >
                <Image
                  source={{ uri: receipt.uri }}
                  className="h-[170px] w-full bg-[#F1F5F9]"
                  resizeMode="cover"
                />
                <View className="px-4 py-3">
                  <Text className="font-semibold text-[#334155]">
                    {receipt.name ?? "Receipt selected"}
                  </Text>
                  <Text className="mt-1 text-[12px] text-[#DC2626]">
                    Tap to remove
                  </Text>
                </View>
              </TouchableOpacity>
            ) : editing?.receiptUrl ? (
              <Text className="text-[12px] text-[#1D5478]">
                Existing receipt uploaded. Select a new file to replace it.
              </Text>
            ) : null}
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                disabled={busy}
                onPress={() => save("DRAFT")}
                className="h-[48px] flex-1 items-center justify-center rounded-[12px] bg-[#EEF2F6]"
              >
                <Text className="font-semibold text-[#334155]">
                  {savingAction === "DRAFT" ? "Saving..." : "Save Draft"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy}
                onPress={() => save("SUBMITTED")}
                className="h-[48px] flex-1 items-center justify-center rounded-[12px] bg-[#1D5478]"
              >
                <Text className="font-semibold text-white">
                  {savingAction === "SUBMITTED"
                    ? editing?.status === "REVISION"
                      ? "Resubmitting..."
                      : "Submitting..."
                    : editing?.status === "REVISION"
                      ? "Resubmit"
                      : editing
                        ? "Save & Submit"
                        : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
        {showDatePicker && (
          <DateTimePicker
            value={form.expenseDate ? new Date(form.expenseDate) : new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}
        <Toaster />
      </Modal>
      <Modal
        visible={selectedExpense !== null}
        animationType="slide"
        onRequestClose={() => setSelectedExpense(null)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center px-5 py-3">
            <TouchableOpacity onPress={() => setSelectedExpense(null)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text className="ml-4 text-[18px] font-semibold text-[#111827]">
              Expense Details
            </Text>
          </View>
          {selectedExpense ? (
            <ScrollView
              contentContainerStyle={{
                padding: 20,
                gap: 12,
                paddingBottom: 40,
              }}
            >
              <View className="rounded-[16px] bg-[#EAF3FA] p-4">
                <Text className="text-[20px] font-bold text-[#111827]">
                  {selectedExpense.title}
                </Text>
                <Text className="mt-2 text-[22px] font-bold text-[#1D5478]">
                  {money(selectedExpense.totalAmount ?? selectedExpense.amount, selectedExpense.currency)}
                </Text>
                <Text className="mt-1 text-[13px] text-[#475467]">
                  Subtotal: {money(selectedExpense.subtotal, selectedExpense.currency)}  |  Tax: {money(selectedExpense.tax, selectedExpense.currency)}
                </Text>
                <Text
                  style={{ color: statusColor(selectedExpense.status) }}
                  className="mt-2 text-[13px] font-semibold"
                >
                  {selectedExpense.status}
                </Text>
              </View>
              <DetailRow
                label="Subtotal"
                value={money(selectedExpense.subtotal, selectedExpense.currency)}
              />
              <DetailRow
                label="Tax"
                value={money(selectedExpense.tax, selectedExpense.currency)}
              />
              <DetailRow
                label="Total Amount"
                value={money(selectedExpense.totalAmount ?? selectedExpense.amount, selectedExpense.currency)}
              />
              <DetailRow
                label="Date"
                value={new Date(
                  selectedExpense.expenseDate,
                ).toLocaleDateString()}
              />
              <DetailRow
                label="Project"
                value={selectedExpense.project?.name}
              />
              <DetailRow
                label={selectedExpense.subTask ? "Subtask" : "Task"}
                value={selectedExpense.subTask?.title ?? selectedExpense.task?.title}
              />
              <DetailRow label="Category" value={selectedExpense.category} />
              <DetailRow label="Vendor" value={selectedExpense.vendor} />
              <DetailRow
                label="Payment Method"
                value={selectedExpense.paymentMethod}
              />
              <DetailRow label="Notes" value={selectedExpense.notes} />
              {selectedExpense && uploadingReceiptIds[selectedExpense.id] ? (
                <View className="flex-row items-center gap-2 rounded-[16px] bg-[#EAF3FA] p-4">
                  <ActivityIndicator size="small" color="#1D5478" />
                  <Text className="text-[13px] font-medium text-[#1D5478]">
                    Receipt is uploading in background...
                  </Text>
                </View>
              ) : selectedExpense && failedReceiptIds[selectedExpense.id] ? (
                <TouchableOpacity
                  onPress={() => retryReceiptUpload(selectedExpense.id, selectedExpense.title)}
                  className="flex-row items-center justify-between rounded-[16px] bg-[#FEE2E2] p-4"
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text className="text-[13px] font-medium text-[#DC2626]">
                      Receipt upload failed
                    </Text>
                  </View>
                  <Text className="text-[13px] font-bold text-[#DC2626] underline">
                    Retry upload
                  </Text>
                </TouchableOpacity>
              ) : null}
              {selectedReceiptUrl ? (
                <View className="overflow-hidden rounded-[16px] border border-[#E5EAF0]">
                  <View className="flex-row items-center justify-between px-4 py-3">
                    <Text className="font-semibold text-[#111827]">
                      Receipt
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(selectedReceiptUrl)}
                    >
                      <Text className="font-semibold text-[#1D5478]">Open</Text>
                    </TouchableOpacity>
                  </View>
                  {isImageReceipt(selectedReceiptUrl) ? (
                    <Image
                      source={{ uri: selectedReceiptUrl }}
                      className="h-[260px] w-full bg-[#F1F5F9]"
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="items-center bg-[#F8FAFC] py-10">
                      <Ionicons
                        name="document-text-outline"
                        size={34}
                        color="#64748B"
                      />
                      <Text className="mt-2 text-[#64748B]">
                        Receipt file uploaded
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center rounded-[16px] border border-dashed border-[#CBD5E1] py-8">
                  <Ionicons name="image-outline" size={28} color="#94A3B8" />
                  <Text className="mt-2 text-[#64748B]">
                    No receipt uploaded
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
          <SelectorSheet
            visible={activeSelector !== null}
            title={selectorTitle}
            options={selectorOptions}
            selectedValue={
              activeSelector === "project"
                ? form.projectId
                : activeSelector === "task"
                ? (form.subTaskId || form.taskId)
                : activeSelector
                  ? form[activeSelector]
                  : ""
            }
            onSelect={selectOption}
            onClose={() => setActiveSelector(null)}
          />
    </SafeAreaView>
  );
}
