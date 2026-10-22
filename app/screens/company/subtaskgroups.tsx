import BackTitleHeader from "@/components/common/BackTitleHeader";
import TaskFilterTabs, { TaskFilter } from "@/components/company/task/TaskFilterTabs";
import { useSubTaskGroupsQuery } from "@/hooks/company/company";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function mapFilterToStatus(filter: TaskFilter): string | undefined {
  if (filter === "Progress") return "in_progress";
  if (filter === "Pending") return "pending";
  if (filter === "Completed") return "completed";
  return undefined;
}

function formatStatusSummary(statusSummary: Record<string, number>) {
  const labels: Record<string, string> = {
    pending: "Pending",
    in_progress: "Progress",
    completed: "Completed",
    review: "Review",
    revision: "Revision",
    in_active: "Inactive",
  };

  return Object.entries(statusSummary)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${labels[status] ?? status} ${count}`)
    .join(" · ");
}

export default function SubtaskGroupsRoute() {
  const params = useLocalSearchParams<{
    parentTaskId?: string;
    projectId?: string;
    title?: string;
    allowSubTaskCreation?: string;
  }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const parentTaskId = Array.isArray(params.parentTaskId)
    ? params.parentTaskId[0]
    : params.parentTaskId;
  const taskTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const allowSubTaskCreationParam = Array.isArray(params.allowSubTaskCreation)
    ? params.allowSubTaskCreation[0]
    : params.allowSubTaskCreation;
  const allowSubTaskCreation = allowSubTaskCreationParam === "true";
  const [filter, setFilter] = useState<TaskFilter>("All");
  const [searchText, setSearchText] = useState("");

  const groupsQuery = useSubTaskGroupsQuery({
    taskId: parentTaskId,
    projectId,
    status: mapFilterToStatus(filter),
    search: searchText.trim() || undefined,
    limit: 50,
  });

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

  const openGroup = (groupTitle: string) => {
    router.push({
      pathname: "/screens/company/subtasks",
      params: {
        parentTaskId,
        projectId,
        title: taskTitle,
        groupTitle,
        allowSubTaskCreation: String(allowSubTaskCreation),
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
            refreshing={groupsQuery.isRefetching}
            onRefresh={() => void groupsQuery.refetch()}
            tintColor="#1E5371"
            colors={["#1E5371"]}
          />
        }
      >
        <BackTitleHeader title="Subtask Groups" onBack={() => router.back()} />

        <View className="px-5 pt-5">
          <View className="mb-4 rounded-[14px] border border-[#D7DEE7] bg-[#F7F9FB] px-4 py-3">
            <Text className="text-[12px] text-[#667085]">Parent Task</Text>
            <Text className="mt-1 text-[17px] font-semibold text-[#26313E]">
              {taskTitle || "Task"}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleCreateSubtask}
            disabled={!projectId || !allowSubTaskCreation}
            className={`h-[52px] flex-row items-center justify-center rounded-[10px] ${
              projectId && allowSubTaskCreation ? "bg-[#1E5371]" : "bg-[#AAB7C2]"
            }`}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
            <Text className="ml-2 text-[16px] font-medium text-white">Create New Subtask</Text>
          </TouchableOpacity>

          <View className="mt-3.5 h-[48px] flex-row items-center rounded-[13px] border border-[#CDD4DB] bg-[#F5F7F9] px-3">
            <Ionicons name="search-outline" size={24} color="#7C8594" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search group..."
              placeholderTextColor="#A0A8B5"
              className="ml-2 flex-1 text-[15px] text-[#26313E]"
            />
          </View>

          {/* <TaskFilterTabs value={filter} onChange={setFilter} /> */}

          {groupsQuery.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#1E5371" />
            </View>
          ) : groupsQuery.data?.data.length ? (
            <View className="mt-3">
              {groupsQuery.data.data.map((group) => (
                <TouchableOpacity
                  key={group.title.toLowerCase()}
                  activeOpacity={0.85}
                  onPress={() => openGroup(group.title)}
                  className="mb-3 rounded-[14px] border border-[#D7DEE7] bg-[#F7F9FB] px-4 py-4"
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-[17px] font-semibold text-[#26313E]">
                        {group.title || "Untitled"}
                      </Text>
                      <Text className="mt-1 text-[13px] text-[#667085]">
                        {group.subTaskCount} subtasks
                      </Text>
                    </View>
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-[#E8EEF3]">
                      <Ionicons name="chevron-forward" size={20} color="#1E5371" />
                    </View>
                  </View>
                  {formatStatusSummary(group.statusSummary) ? (
                    <Text className="mt-3 text-[12px] text-[#667085]">
                      {formatStatusSummary(group.statusSummary)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center py-16">
              <Ionicons name="albums-outline" size={34} color="#98A2B3" />
              <Text className="mt-3 text-[15px] text-[#667085]">
                {groupsQuery.isError ? "Failed to load groups." : "No subtask groups found."}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
