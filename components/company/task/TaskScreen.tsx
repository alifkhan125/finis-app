import {
  useReviewTaskApprovalMutation,
  useReviewTaskCompletionMutation,
  useTasksQuery,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
} from "@/hooks/company/company";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import TaskCard from "./TaskCard";
import TaskFilterTabs, { TaskFilter } from "./TaskFilterTabs";
import { setTasks, updateTaskStatus, useTaskItems } from "./taskStore";
import type { TaskItem, TaskStatus } from "./types";
import UpdateTaskStatusModal from "./UpdateTaskStatusModal";

function mapFilterToStatus(filter: TaskFilter): string | undefined {
  if (filter === "Progress") return "in_progress";
  if (filter === "Pending") return "pending";
  if (filter === "Completed") return "completed";
  return undefined;
}

function mapStatus(status: string, approvalDecision?: string | null): TaskStatus {
  const s = status.toLowerCase();
  if (s === "in_progress") return "In Progress";
  if (s === "completed") return "Completed";
  if (s === "review") return "Review";
  if (s === "revision") return "Revision";
  if (approvalDecision !== "approved") return "Inactive";
  return "Pending";
}

function mapStatusToApi(status: TaskStatus): string {
  if (status === "In Progress") return "in_progress";
  if (status === "Completed") return "completed";
  if (status === "Revision") return "revision";
  return "pending";
}


type TaskScreenProps = {
  projectId?: string;
  onCreateTaskPress?: () => void;
};

export default function TaskScreen({ projectId, onCreateTaskPress }: TaskScreenProps) {
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [searchText, setSearchText] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const deleteTaskMutation = useDeleteTaskMutation();

  const { data, isLoading } = useTasksQuery({
    page,
    limit,
    status: mapFilterToStatus(filter),
    search: searchText.trim() || undefined,
    projectId,
  });

  const tasks = useTaskItems();

  useEffect(() => {
    if (data?.data) {
      const mapped = data.data.map((task) => ({
        id: task.id,
        title: task.title,
        location:
          task.location ||
          [task.project?.name, task.floor?.name, task.room?.name]
            .filter(Boolean)
            .join(" - "),
        assignee: `Assigned Worker ${task.assignedWorkerCount ?? 0}`,
        startDate: new Date(task.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dueDate: new Date(task.dueDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        status: mapStatus(task.status, task.approvalDecision),
        description: task.description,
        priority: task.priority,
        projectId: task.projectId,
        floorId: task.floorId,
        floorName: task.floor?.name,
        unitId: task.roomId,
        unitName: task.room?.name,
        reportCount: task._count?.reports ?? 0,
        subTaskCount: task.subTaskCount ?? task._count?.subTasks ?? 0,
        completedSubTaskCount: task.completedSubTaskCount ?? 0,
        assignedWorkerCount: task.assignedWorkerCount ?? 0,
        allowSubTaskCreation: task.allowSubTaskCreation ?? false,
        approvalDecision: task.approvalDecision,
        completionDecision: task.completionDecision,
        price: task.price,
        rawStatus: task.status,
        floorUnitSelections: (task as any).floorUnitSelections,
      }));
      setTasks(mapped);
    } else if (!isLoading) {
      setTasks([]);
    }
  }, [data, isLoading]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [filter, searchText]);

  const selectedTask = useMemo<TaskItem | null>(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const updateStatusMutation = useUpdateTaskStatusMutation();
  const reviewTaskApprovalMutation = useReviewTaskApprovalMutation();
  const reviewTaskCompletionMutation = useReviewTaskCompletionMutation();

  const handleSelectStatus = (status: TaskStatus) => {
    if (!selectedTaskId) return;
    updateTaskStatus(selectedTaskId, status);
    updateStatusMutation.mutate({
      id: selectedTaskId,
      status: mapStatusToApi(status),
    });
    setSelectedTaskId(null);
  };


  const totalPages = data?.meta?.totalPages || 1;

  return (
    <View className="mt-6 px-5">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onCreateTaskPress}
        className="h-[52px] flex-row items-center justify-center rounded-[10px] bg-[#1E5371]"
      >
        <Ionicons name="add" size={22} color="#F4F8FA" />
        <Text className="ml-2 text-[16px] font-medium text-[#F4F8FA]">
          Create New Task 
        </Text>
      </TouchableOpacity>

      <View className="mt-3.5 h-[48px] flex-row items-center rounded-[13px] border border-[#CDD4DB] bg-[#F5F7F9] px-3">
        <Ionicons name="search-outline" size={24} color="#7C8594" />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search......"
          placeholderTextColor="#A0A8B5"
          className="ml-2 flex-1 text-[15px] text-[#26313E]"
        />
      </View>

      <TaskFilterTabs value={filter} onChange={setFilter} />

      {isLoading ? (
        <View className="mt-10 items-center justify-center">
          <ActivityIndicator size="large" color="#1E5371" />
        </View>
      ) : (
        <View className="mt-2">
          {tasks.length === 0 ? (
            <View className="mt-10 items-center justify-center">
              <Text className="text-[16px] font-medium text-[#536174]">
                No tasks found
              </Text>
            </View>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}

                subTaskCount={task.subTaskCount ?? 0}
                completedTaskCount={task.completedSubTaskCount ?? 0}
                isActionLoading={
                  reviewTaskApprovalMutation.isPending ||
                  reviewTaskCompletionMutation.isPending
                }
                onPressEdit={() =>
                  router.push({
                    pathname: "/screens/company/createtask",
                    params: {
                      taskId: task.id,
                      projectId: task.projectId || projectId,
                      editTaskAllowSubTaskCreation: String(task.allowSubTaskCreation ?? false),
                      editTaskTitle: task.title,
                      editTaskDescription: task.description || "",
                      editTaskPriority: task.priority || "MEDIUM",
                      editTaskDueDate: task.dueDate || "",
                      editTaskPrice: task.price != null ? String(task.price) : "",
                      editTaskFloorUnits: task.floorUnitSelections?.length 
                        ? JSON.stringify(task.floorUnitSelections) 
                        : (task.floorId && task.unitId ? JSON.stringify([{ floor: { id: task.floorId, name: task.floorName }, unit: { id: task.unitId, name: task.unitName } }]) : ""),
                    },
                  })
                }
                onPressDelete={() =>
                  Alert.alert(
                    "Delete Task",
                    "Are you sure you want to delete this task?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => deleteTaskMutation.mutate(task.id),
                      },
                    ]
                  )
                }
                onPress={() =>
                  router.push({
                    pathname: "/screens/company/subtaskgroups",
                    params: {
                      parentTaskId: task.id,
                      projectId: task.projectId || projectId,
                      title: task.title,
                      allowSubTaskCreation: String(task.allowSubTaskCreation ?? false),
                    },
                  })
                }
                onPressUpdateStatus={() => {
                  if (task.completionDecision === "approved" || task.status === "Completed") {
                    return;
                  }

                  if (task.approvalDecision !== "approved") {
                    reviewTaskApprovalMutation.mutate({
                      taskId: task.id,
                      reviewDecision: "approved",
                    });
                    return;
                  }

                  const allSubtasksCompleted =
                    (task.subTaskCount ?? 0) > 0 &&
                    (task.completedSubTaskCount ?? 0) === (task.subTaskCount ?? 0);

                  if (allSubtasksCompleted && task.rawStatus?.toLowerCase() === "review") {
                    reviewTaskCompletionMutation.mutate({
                      taskId: task.id,
                      reviewDecision: "approved",
                    });
                    return;
                  }

                  setSelectedTaskId(task.id);
                }}
                onPressAssignWorker={() => {
                  router.push({
                    pathname: "/screens/company/assigntask",
                    params: { taskId: task.id, projectId },
                  });
                }}
              />
            ))
          )}
        </View>
      )}

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <View className="mt-6 flex-row items-center justify-between pb-6">
          <TouchableOpacity
            disabled={page === 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            className={`h-10 items-center justify-center rounded-[9px] border px-4 ${page === 1
                ? "border-[#D2DAE1] bg-[#DFE6EA]/50 opacity-50"
                : "border-[#1F5777] bg-[#1F5777]"
              }`}
          >
            <Text
              className={`text-[15px] font-medium ${page === 1 ? "text-[#3E4B59]" : "text-white"
                }`}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <Text className="text-[15px] font-medium text-[#3E4B59]">
            Page {page} of {totalPages}
          </Text>

          <TouchableOpacity
            disabled={page === totalPages}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`h-10 items-center justify-center rounded-[9px] border px-4 ${page === totalPages
                ? "border-[#D2DAE1] bg-[#DFE6EA]/50 opacity-50"
                : "border-[#1F5777] bg-[#1F5777]"
              }`}
          >
            <Text
              className={`text-[15px] font-medium ${page === totalPages ? "text-[#3E4B59]" : "text-white"
                }`}
            >
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <UpdateTaskStatusModal
        visible={Boolean(selectedTask)}
        task={selectedTask}
        onClose={() => setSelectedTaskId(null)}
        onSelectStatus={handleSelectStatus}
      />
    </View>
  );
}
