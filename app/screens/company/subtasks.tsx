import BackTitleHeader from "@/components/common/BackTitleHeader";
import TaskCard from "@/components/company/task/TaskCard";
import TaskFilterTabs, { TaskFilter } from "@/components/company/task/TaskFilterTabs";
import type { TaskItem, TaskStatus } from "@/components/company/task/types";
import {
  useReviewSubTaskApprovalMutation,
  useReviewSubTaskReportMutation,
  useTaskDetailsQuery,
  useTaskSubTasksQuery,
  useSubTasksByGroupQuery,
  useDeleteSubTaskMutation,
  useProjectFloorsQuery,
} from "@/hooks/company/company";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function mapStatus(status: string, approvalDecision?: string | null): TaskStatus {
  const normalized = (status ?? "").toLowerCase().trim();
  const normalizedApproval = (approvalDecision ?? "").toLowerCase().trim();

  if (normalized === "in_active" || normalized === "inactive") return "Inactive";
  if (normalized === "in_progress") return "In Progress";
  if (normalized === "review") return "Review";
  if (normalized === "revision") return "Revision";
  if (normalized === "completed") {
    return normalizedApproval === "approved" ? "Completed" : "Review";
  }
  return "Pending";
}

function formatDateLabel(dateValue: string) {
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function mapFilterToStatus(filter: TaskFilter): string | undefined {
  if (filter === "Progress") return "in_progress";
  if (filter === "Pending") return "pending";
  if (filter === "Completed") return "completed";
  return undefined;
}

export default function SubtasksRoute() {
  const params = useLocalSearchParams<{
    parentTaskId?: string;
    projectId?: string;
    title?: string;
    groupTitle?: string;
    allowSubTaskCreation?: string;
  }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const parentTaskId = Array.isArray(params.parentTaskId)
    ? params.parentTaskId[0]
    : params.parentTaskId;
  const taskTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const groupTitle = Array.isArray(params.groupTitle) ? params.groupTitle[0] : params.groupTitle;
  const allowSubTaskCreationParam = Array.isArray(params.allowSubTaskCreation)
    ? params.allowSubTaskCreation[0]
    : params.allowSubTaskCreation;
  const allowSubTaskCreation = allowSubTaskCreationParam !== "false";
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [searchText, setSearchText] = useState("");

  const status = mapFilterToStatus(filter);
  const flatSubtasksQuery = useTaskSubTasksQuery(
    groupTitle ? undefined : parentTaskId,
    searchText.trim() || undefined,
  );
  const groupedSubtasksQuery = useSubTasksByGroupQuery(groupTitle, {
    taskId: parentTaskId,
    projectId,
    status,
    limit: 100,
  });
  const taskDetailsQuery = useTaskDetailsQuery(parentTaskId);
  const reviewSubTaskMutation = useReviewSubTaskApprovalMutation(parentTaskId);
  const reviewSubTaskReportMutation = useReviewSubTaskReportMutation(parentTaskId);
  const deleteSubTaskMutation = useDeleteSubTaskMutation(parentTaskId);
  const { data: projectFloorsData } = useProjectFloorsQuery(projectId);

  const subtasks = useMemo<TaskItem[]>(() => {
    const unitToFloorMap = new Map<string, { id: string; name: string }>();

    // Check both parent task floors and project floors to ensure we find the unit's floor
    const sources = [
      ...(taskDetailsQuery.data?.floors ?? []),
      ...(projectFloorsData ?? []),
    ];

    sources.forEach((floor) => {
      floor.units?.forEach((unit) => {
        if (!unitToFloorMap.has(unit.id)) {
          unitToFloorMap.set(unit.id, { id: floor.id, name: floor.name });
        }
      });
    });

    const sourceSubtasks = groupTitle
      ? groupedSubtasksQuery.data?.data ?? []
      : flatSubtasksQuery.data?.data ?? [];

    return sourceSubtasks.map((task) => {
      const units = (
        task.units?.filter(Boolean) ??
        task.subTaskUnits?.map((item) => item.unit).filter(Boolean) ??
        (task.unit ? [task.unit] : task.taskAssignee?.unit ? [task.taskAssignee.unit] : [])
      ).filter((unit, index, array) => array.findIndex((item) => item.id === unit.id) === index);

      const locationLabel = units.length
        ? units
          .map((unit) => {
            const floorObj = unit.floor || unitToFloorMap.get(unit.id);
            return floorObj ? `${floorObj.name} - ${unit.name}` : unit.name;
          })
          .join(", ")
        : "Unit";

      const floorUnitSelections = units.flatMap((unit) => {
        const floorObj = unit.floor || unitToFloorMap.get(unit.id);
        if (floorObj) {
          return [{ floor: floorObj, unit }];
        }
        return [];
      });

      const displayStatus = mapStatus(task.status, task.approvalDecision);

      const displayDate = task.dueDate || task.completedAt || task.submittedAt || task.createdAt;

      return {
        id: task.id,
        projectId: projectId,
        title: task.title,
        location: locationLabel,
        assignee: task.taskAssignee?.user?.fullName || "Unassigned",
        startDate: formatDateLabel(displayDate ?? ""),
        dueDate: formatDateLabel(displayDate ?? ""),
        status: displayStatus,
        description: task.description || undefined,
        priority: task.priority || "medium",
        approvalDecision: task.approvalDecision,
        rawStatus: task.status,
        floorUnitSelections: floorUnitSelections,
        estimatedHours: task.estimatedHours,
        price: task.price,
      };
    });
  }, [flatSubtasksQuery.data, groupTitle, groupedSubtasksQuery.data, projectId, taskDetailsQuery.data, projectFloorsData]);

  const filteredSubtasks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    const searchedSubtasks =
      groupTitle && normalizedSearch
        ? subtasks.filter((task) =>
          [
            task.title,
            task.description,
            task.location,
            task.assignee,
            task.status,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
        )
        : subtasks;

    if (groupTitle || filter === "All") return searchedSubtasks;
    if (filter === "Progress") {
      return searchedSubtasks.filter((task) => task.status === "In Progress");
    }
    return searchedSubtasks.filter((task) => task.status === filter);
  }, [filter, groupTitle, searchText, subtasks]);

  const isLoading = groupTitle ? groupedSubtasksQuery.isLoading : flatSubtasksQuery.isLoading;
  const isRefetching = groupTitle
    ? groupedSubtasksQuery.isRefetching
    : flatSubtasksQuery.isRefetching;
  const isError = groupTitle ? groupedSubtasksQuery.isError : flatSubtasksQuery.isError;

  const handleRefresh = () => {
    if (groupTitle) {
      void groupedSubtasksQuery.refetch();
    } else {
      void flatSubtasksQuery.refetch();
    }
  };

  const handleCreateSubtask = () => {
    if (!projectId) return;
    router.push({
      pathname: "/screens/company/createsubtask",
      params: {
        projectId,
        parentTaskId,
        parentTaskTitle: taskTitle,
      },
    });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-[#E9EDF1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor="#1E5371"
            colors={["#1E5371"]}
          />
        }
      >
        <BackTitleHeader title="Subtasks" onBack={() => router.back()} />

        <View className="px-5 pt-5">
          <View className="mb-4 rounded-[14px] border border-[#D7DEE7] bg-[#F7F9FB] px-4 py-3">
            <Text className="text-[12px] text-[#667085]">Parent Task</Text>
            <Text className="mt-1 text-[17px] font-semibold text-[#26313E]">
              {taskTitle || "Task"}
            </Text>
            {groupTitle ? (
              <Text className="mt-1 text-[13px] font-medium text-[#1E5371]">
                Group: {groupTitle}
              </Text>
            ) : null}
          </View>

          {/* <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreateSubtask}
            disabled={!projectId || !allowSubTaskCreation}
            className={`h-[52px] flex-row items-center justify-center rounded-[10px] ${
              projectId && allowSubTaskCreation ? "bg-[#1E5371]" : "bg-[#AAB7C2]"
            }`}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text className="ml-2 text-[16px] font-medium text-white">Create New Subtask</Text>
          </TouchableOpacity>    */}

          <View className="h-[48px] flex-row items-center rounded-[13px] border border-[#CDD4DB] bg-[#F5F7F9] px-3">
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
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#1E5371" />
            </View>
          ) : filteredSubtasks.length ? (
            <View className="mt-3">
              {filteredSubtasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isActionLoading={reviewSubTaskMutation.isPending || reviewSubTaskReportMutation.isPending}
                  onPressEdit={() =>
                    router.push({
                      pathname: "/screens/company/createsubtask",
                      params: {
                        taskId: task.id,
                        parentTaskId: parentTaskId,
                        parentTaskTitle: taskTitle,
                        projectId: projectId,
                        editTaskTitle: task.title,
                        editTaskDescription: task.description || "",
                        editTaskPriority: task.priority || "MEDIUM",
                        editTaskDueDate: task.dueDate || "",
                        editTaskPrice: task.price != null ? String(task.price) : "",
                        editTaskFloorUnits: task.floorUnitSelections?.length
                          ? JSON.stringify(task.floorUnitSelections)
                          : (task.floorId && task.unitId ? JSON.stringify([{ floor: { id: task.floorId, name: task.floorName }, unit: { id: task.unitId, name: task.unitName } }]) : ""),
                        editTaskEstimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : "",
                      },
                    })
                  }
                  onPressDelete={() => {
                    Alert.alert(
                      "Delete Subtask",
                      "Are you sure you want to delete this subtask?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteSubTaskMutation.mutate(task.id),
                        },
                      ]
                    );
                  }}
                  subtaskActionLabel={["Inactive", "Review"].includes(task.status) ? "Approve Sub Task" : "Approved Sub Task"}
                  subtaskActionDisabled={!["Inactive", "Review"].includes(task.status)}
                  onPressSubtaskAction={() =>
                    task.status === "Review"
                      ? reviewSubTaskReportMutation.mutate({
                        subTaskId: task.id,
                        payload: {
                          reviewDecision: "approved",
                        },
                      })
                      : reviewSubTaskMutation.mutate({
                        subTaskId: task.id,
                        reviewDecision: "approved",
                      })
                  }
                  onPress={() =>
                    task.id
                      ? router.push({
                        pathname: "/screens/company/taskdetails",
                        params: { subTaskId: task.id },
                      })
                      : undefined
                  }
                />
              ))}
            </View>
          ) : (
            <View className="items-center py-16">
              <Ionicons name="list-outline" size={34} color="#98A2B3" />
              <Text className="mt-3 text-[15px] text-[#667085]">
                {isError
                  ? "Failed to load subtasks."
                  : `No ${groupTitle || filter === "All" ? "subtasks" : filter.toLowerCase() + " subtasks"} found.`}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
