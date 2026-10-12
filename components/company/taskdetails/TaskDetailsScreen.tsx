import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useReviewTaskReportMutation } from "@/hooks/company/company";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner-native";
import type { TaskDetailsData } from "@/types/company.types";
import { TaskStatus } from "../task/types";
import TaskDetailMetaItem from "./TaskDetailMetaItem";
import TaskExpensesCard, { TaskExpenseDocument } from "./TaskExpensesCard";
import TaskInventoryRow from "./TaskInventoryRow";
import TaskPhotoCard from "./TaskPhotoCard";

type TaskDetailsScreenProps = {
  task?: TaskDetailsData;
  isSubTaskMode?: boolean;
  subTaskReviewMutation?: {
    isPending: boolean;
    variables?: {
      subTaskId: string;
      payload: {
        reviewDecision: "approved" | "rejected";
        reviewDescription?: string;
        reviewAttachmentUrl?: string;
        expenseAmount?: number;
      };
      file?: { uri: string; name?: string | null; type?: string | null };
    };
    mutateAsync: (params: {
      subTaskId: string;
      payload: {
        reviewDecision: "approved" | "rejected";
        reviewDescription?: string;
        reviewAttachmentUrl?: string;
        expenseAmount?: number;
      };
      file?: { uri: string; name?: string | null; type?: string | null };
    }) => Promise<unknown>;
  };
  updateTaskMutation?: {
    isPending: boolean;
    mutateAsync: (params: {
      taskId: string;
      payload: {
        expenseDescription?: string;
        expenseAmount?: number;
      };
      file?: { uri: string; name?: string | null; type?: string | null };
    }) => Promise<unknown>;
  };
};

function toStatusBadge(status: TaskStatus | undefined, approvalDecision?: string | null) {
  if (approvalDecision === "rejected") return "REVISION";
  if (!status) return "PENDING";
  if (status === "In Progress") return "IN PROGRESS";
  return status.toUpperCase();
}

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatDate(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString();
}

function formatSubTaskStatus(status: string, approvalDecision?: string | null) {
  if (approvalDecision === "rejected") return "REVISION";
  const normalized = status.toLowerCase();
  if (normalized === "in_progress") return "IN PROGRESS";
  if (normalized === "completed") return "COMPLETED";
  return "PENDING";
}

function getSubTaskStatusStyle(status: string, approvalDecision?: string | null) {
  if (approvalDecision === "rejected") return { bg: "#FEE2E2", text: "#991B1B" };
  const normalized = status.toLowerCase();
  if (normalized === "completed") {
    return { bg: "#DDF2E8", text: "#0C8F41" };
  }
  if (normalized === "in_progress") {
    return { bg: "#DDE8FF", text: "#2051F8" };
  }
  return { bg: "#FFF4E8", text: "#E58B18" };
}

export default function TaskDetailsScreen({
  task,
  updateTaskMutation,
  isSubTaskMode = false,
  subTaskReviewMutation,
}: TaskDetailsScreenProps) {
  const description = task?.description?.trim() || "—";
  const currentUserRole = useAuthStore((state) => state.user?.role);
  const [reviewDescription, setReviewDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<TaskExpenseDocument[]>([]);
  const normalizedStatus = (task?.status ?? "").toLowerCase().trim();
  const canReviewTask =
    (currentUserRole === "admin" || currentUserRole === "manager") &&
    normalizedStatus === "review";
  const canSeeInternalPrice =
    (currentUserRole === "admin" || currentUserRole === "super_admin") &&
    task?.price !== undefined &&
    task?.price !== null;

  const reportId = task?.reports?.[0]?.id;
  const taskId = task?.id;
  const reviewMutation = useReviewTaskReportMutation(taskId || "", reportId || "");
  const isDecisionPending = isSubTaskMode ? Boolean(subTaskReviewMutation?.isPending) : reviewMutation.isPending;
  const pendingDecision = isSubTaskMode
    ? subTaskReviewMutation?.variables?.payload?.reviewDecision
    : reviewMutation.variables;

  const handleReview = async (decision: "approved" | "rejected") => {
    if (!taskId) {
      toast.error("No report available to review");
      return;
    }
    
    try {
      const selectedFile = uploadedFiles[0];
      const parsedAmount = Number.parseFloat(expenseAmount);

      if (!isSubTaskMode && task?.id && updateTaskMutation && !updateTaskMutation.isPending) {
        await updateTaskMutation.mutateAsync({
          taskId: task.id,
          payload: {
            expenseDescription: reviewDescription.trim() || task.title || "Task expense",
            expenseAmount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
          },
          file: selectedFile
            ? {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.mimeType,
              }
            : undefined,
        });
      }

      if (isSubTaskMode) {
        if (!subTaskReviewMutation) {
          toast.error("Sub task review is unavailable");
          return;
        }

        const selectedFile = uploadedFiles[0];
        const parsedAmount = Number.parseFloat(expenseAmount);
        await subTaskReviewMutation.mutateAsync({
          subTaskId: taskId,
          payload: {
            reviewDecision: decision,
            reviewDescription: reviewDescription.trim() || undefined,
            reviewAttachmentUrl: selectedFile?.uri,
            expenseAmount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
          },
          file: selectedFile
            ? {
                uri: selectedFile.uri,
                name: selectedFile.name,
                type: selectedFile.mimeType,
              }
            : undefined,
        });
      } else {
        if (!reportId) {
          toast.error("No report available to review");
          return;
        }
        await reviewMutation.mutateAsync(decision);
      }
      setReviewDescription(decision === "approved" ? "Approved" : "Rejected");
      setExpenseAmount("");
      setUploadedFiles([]);
      toast.success(decision === "approved" ? "Task approved successfully" : "Task rejected successfully");
    } catch {
      // Error handled by hook
    }
  };

  const beforePhoto = task?.reports?.[0]?.beforePhotoUrl;
  const afterPhoto = task?.reports?.[0]?.afterPhotoUrl;
  const reportNotes = task?.reports?.[0]?.notes || "No report summary available.";
  const subTasks = task?.subTasks ?? [];
  const groupedInventories = (task?.taskInventories ?? []).reduce((acc: Record<string, { label: string; qty: number; unit: string }>, inv) => {
    const id = inv.inventory?.id;
    if (id) {
      if (!acc[id]) {
        acc[id] = {
          label: inv.inventory?.name || "Unknown",
          qty: 0,
          unit: inv.inventory?.unit || "",
        };
      }
      acc[id].qty += inv.qtyUsed || 0;
    }
    return acc;
  }, {});

  const inventories = Object.values(groupedInventories).map((inv: any) => ({
    label: inv.label,
    quantity: `${inv.qty} ${inv.unit}`.trim(),
  }));

  const handleUploadFile = async () => {
    try {
      const DocumentPicker = await import("expo-document-picker");
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const firstAsset = result.assets[0];
      setUploadedFiles((previous) => {
        const existing = new Set(previous.map((file) => file.id));
        const nextFiles = result.assets
          .map((asset) => ({
            id: `${asset.name}-${asset.size ?? 0}-${asset.uri}`,
            name: asset.name,
            uri: asset.uri,
            size: asset.size,
            mimeType: asset.mimeType,
          }))
          .filter((file) => !existing.has(file.id));

        return [...previous, ...nextFiles];
      });

    } catch {
      Alert.alert("Upload failed", "Unable to pick files right now.");
    }
  };

  const handleRemoveDocument = (id: string) => {
    setUploadedFiles((previous) => previous.filter((file) => file.id !== id));
  };

  return (
    <View className="mt-5 px-5 pb-8">
      <View className="rounded-[16px] border border-[#DADFE5] bg-white p-3.5">
        <Text className="text-[15px] font-semibold text-[#1F2937]">
          Task Details
        </Text>
        <Text className="mt-4 text-[13px] leading-[26px] text-[#5B6472]">
          {description}
        </Text>

        <TaskDetailMetaItem
          icon="location-outline"
          label="Project"
          value={
            [task?.project?.name, task?.floor?.name, task?.room?.name]
              .filter(Boolean)
              .join(" • ") || "—"
          }
          statusBadgeText={toStatusBadge(task?.status as TaskStatus, task?.approvalDecision)}
        />
        <TaskDetailMetaItem
          icon="person-outline"
          label="Assigned To"
          value={task?.assignee?.fullName || task?.taskAssignees?.[0]?.user?.fullName || "—"}
        />
        <TaskDetailMetaItem
          icon="calendar-outline"
          label="Due Date"
          value={formatDate(task?.dueDate)}
        />
        <TaskDetailMetaItem
          icon="time-outline"
          label="Estimated Time"
          value={
            typeof task?.estimatedHours === "number"
              ? `${task.estimatedHours} hours`
              : "—"
          }
        />
        {canSeeInternalPrice ? (
          <TaskDetailMetaItem
            icon="cash-outline"
            label="Internal Price"
            value={formatMoney(Number(task?.price ?? 0))}
          />
        ) : null}
      </View>

      <TaskPhotoCard title="Before Photo" imageUrl={beforePhoto} />
      <TaskPhotoCard title="After Photo" imageUrl={afterPhoto} />

      {subTasks.length > 0 && (
        <View className="mt-5 rounded-[16px] border border-[#DADFE5] bg-white p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[15px] font-semibold text-[#1F2937]">
              Subtasks
            </Text>
            <Text className="text-[12px] text-[#667085]">
              {subTasks.length} total
            </Text>
          </View>

          <View className="mt-4 gap-3">
            {subTasks.map((subTask) => {
              const badgeStyle = getSubTaskStatusStyle(subTask.status);
              return (
                <View
                  key={subTask.id}
                  className="rounded-[14px] border border-[#E5EAF0] bg-[#FAFBFC] px-3 py-3"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[14px] font-semibold text-[#111827]">
                        {subTask.title}
                      </Text>
                      <Text className="mt-1 text-[12px] text-[#6B7280]">
                        Unit: {subTask.unit?.name || "Unknown"}
                      </Text>
                      {subTask.taskAssignee?.user?.fullName ? (
                        <Text className="mt-0.5 text-[12px] text-[#6B7280]">
                          Assigned to: {subTask.taskAssignee.user.fullName}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{ backgroundColor: badgeStyle.bg }}
                    >
                      <Text
                        className="text-[10px] font-semibold"
                        style={{ color: badgeStyle.text }}
                      >
                        {formatSubTaskStatus(subTask.status)}
                      </Text>
                    </View>
                  </View>

                  {subTask.description ? (
                    <Text className="mt-2 text-[12px] leading-[18px] text-[#4B5563]">
                      {subTask.description}
                    </Text>
                  ) : null}
                  {subTask.estimatedHours ? (
                    <Text className="mt-1 text-[12px] leading-[18px] text-[#4B5563]">
                      Estimated Hours: {subTask.estimatedHours}
                    </Text>
                  ) : null}
                  {canSeeInternalPrice && subTask.price !== undefined && subTask.price !== null ? (
                    <Text className="mt-1 text-[12px] font-semibold leading-[18px] text-[#168044]">
                      Internal Price: {formatMoney(Number(subTask.price ?? 0))}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View className="mt-5 rounded-[16px] border border-[#DADFE5] bg-white p-4">
        <Text className="text-[15px] font-semibold text-[#1F2937]">
          Task Report Summary
        </Text>
        <Text className="mt-5 text-[13px] leading-[24px] text-[#737B88]">
          &quot;{reportNotes}&quot;
        </Text>
      </View>

      <View className="mt-6">
        <Text className="text-[16px] font-medium  text-[#222325]">
          Inventory Used 
        </Text>

        {inventories.length ? (
          <View className="mt-3 gap-3">
            {inventories.map((item, i) => (
              <TaskInventoryRow
                key={item.label + i}
                label={item.label}
                quantity={item.quantity}
              />
            ))}
          </View>
        ) : (
          <Text className="mt-3 text-[13px] text-[#737B88]">
            No inventory used for this task.
          </Text>
        )}
      </View>

      <View className="mt-6">
        <Text className="text-[15px] font-semibold text-[#1F2937]">
          Task Expenses
        </Text>
          {task?.expenses?.length ? (
            <View className="mt-3 rounded-[14px] border border-[#DADFE5] bg-white p-4">
              <Text className="text-[13px] font-semibold text-[#1F2937]">
                Backend Expenses
              </Text>
              <View className="mt-3 gap-3">
                {task.expenses.map((expense) => (
                  <View
                    key={expense.id}
                    className="rounded-[12px] border border-[#E5EAF0] bg-[#FAFBFC] px-3 py-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] font-medium text-[#111827]">
                        {expense.description}
                      </Text>
                      <Text className="text-[14px] font-semibold text-[#1E5371]">
                        {formatMoney(expense.amount)}
                      </Text>
                    </View>
                    <View className="mt-1 flex-row items-center justify-between">
                      <Text className="text-[12px] text-[#6B7280]">
                        {expense.category}
                      </Text>
                      <Text className="text-[12px] text-[#6B7280]">
                        {new Date(expense.date).toLocaleDateString()}
                      </Text>
                    </View>
                    {expense.receiptUrl ? (
                      <View className="mt-3 overflow-hidden rounded-[10px] border border-[#D7DEE7] bg-white">
                        <Image
                          source={{ uri: expense.receiptUrl }}
                          resizeMode="cover"
                          className="h-[140px] w-full bg-[#EEF3F8]"
                        />
                      </View>
                    ) : null}
                    <Text className="mt-1 text-[12px] text-[#14803C]">
                      {expense.status}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        {canReviewTask ? (
          <>
            <View className="mt-3">
              <Text className="text-[13px] text-[#374151]">Total Expenses Amount</Text>
              <TextInput
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="Enter total expenses amount"
                placeholderTextColor="#A0A8B5"
                keyboardType="decimal-pad"
                className="mt-2 h-[48px] rounded-[12px] border border-[#D7DEE7] bg-white px-4 text-[15px] text-[#111827]"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleUploadFile}
              className="mt-4 h-[52px] flex-row items-center justify-center rounded-[12px] bg-[#1E5371]"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#F3F7FA" />
              <Text className="ml-2 text-[16px] font-medium text-[#F3F7FA]">
                Upload Expense Document
              </Text>
            </TouchableOpacity>

            {uploadedFiles.length ? (
              <Text className="mt-2 text-[12px] text-[#6B7280]">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} selected
              </Text>
            ) : null}

            <TaskExpensesCard
              documents={uploadedFiles}
              onRemoveDocument={handleRemoveDocument}
            />
          </>
        ) : null}

      </View>

      {canReviewTask ? (
        <>
          <View className="mt-6">
            <Text className="text-[15px] font-semibold text-[#1F2937]">
              Review & Decision
            </Text>

            <View className="mt-3">
              <Text className="text-[13px] text-[#374151]">Description</Text>
              <TextInput
                value={reviewDescription}
                onChangeText={setReviewDescription}
                placeholder="Review description"
                placeholderTextColor="#A0A8B5"
                multiline
                textAlignVertical="top"
                className="mt-2 h-[112px] rounded-[12px] border border-[#D7DEE7] bg-white px-4 py-3 text-[15px] text-[#111827]"
              />
            </View>

          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleReview("rejected")}
              disabled={isDecisionPending}
              className="h-[52px] w-[47.5%] items-center justify-center rounded-[12px] border border-[#D6DDE5] bg-white opacity-90 disabled:opacity-50"
            >
              {isDecisionPending && pendingDecision === "rejected" ? (
                <ActivityIndicator color="#1E1E1E" />
              ) : (
                <Text className="text-[16px] font-medium text-[#1E1E1E]">Revision</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleReview("approved")}
              disabled={isDecisionPending}
              className="h-[52px] w-[47.5%] items-center justify-center rounded-[12px] bg-[#1E5371] opacity-90 disabled:opacity-50"
            >
              {isDecisionPending && pendingDecision === "approved" ? (
                <ActivityIndicator color="#F3F7FA" />
              ) : (
                <Text className="text-[16px] font-medium text-[#F3F7FA]">Approve Work</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : null}
    </View>
  );
}
