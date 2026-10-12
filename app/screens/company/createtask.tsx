import BackTitleHeader from "@/components/common/BackTitleHeader";
import TaskFormField from "@/components/company/task/TaskFormField";
import TaskFloorUnitMultiSelect, {
  TaskFloorUnitSelection,
} from "@/components/company/task/TaskFloorUnitMultiSelect";
import { setTaskDraft } from "@/components/company/task/taskStore";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useProjectFloorsQuery,
  useProjectProfileQuery
} from "@/hooks/company/company";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CreateTaskRoute() {
  const { projectId, parentTaskTitle, editTaskTitle, editTaskDescription, editTaskPriority, editTaskDueDate, editTaskFloorUnits, taskId } = useLocalSearchParams<{
    projectId?: string;
    parentTaskTitle?: string;
    editTaskTitle?: string;
    editTaskDescription?: string;
    editTaskPriority?: "LOW" | "MEDIUM" | "HIGH";
    editTaskDueDate?: string;
    editTaskFloorUnits?: string;
    taskId?: string;
  }>();
  const resolvedParentTaskTitle = Array.isArray(parentTaskTitle)
    ? parentTaskTitle[0]
    : parentTaskTitle;
  const isSubtaskMode = Boolean(resolvedParentTaskTitle);

  const { data: projectProfile, isLoading: isProjectLoading } = useProjectProfileQuery(projectId);
  const { data: floors, isLoading: isFloorsLoading } = useProjectFloorsQuery(projectId);

  const [title, setTitle] = useState(editTaskTitle ?? resolvedParentTaskTitle ?? "");
  const [description, setDescription] = useState(editTaskDescription ?? "");

  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(editTaskPriority ?? "MEDIUM");
  const [showPrioritySheet, setShowPrioritySheet] = useState(false);

  const [dueDate, setDueDate] = useState(editTaskDueDate ?? "");
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(editTaskDueDate ? new Date(editTaskDueDate) : new Date());

  const [estimatedHours, setEstimatedHours] = useState('');

  const [floorUnitSelections, setFloorUnitSelections] = useState<TaskFloorUnitSelection[]>([]);
  const [allowSubTaskCreation, setAllowSubTaskCreation] = useState(true);

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation(taskId ?? "");

  const handleDueDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (event.type === "dismissed") {
      setShowDueDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDueDateValue(selectedDate);
      setDueDate(formatDate(selectedDate));
    }
    setShowDueDatePicker(false);
  };

  const handleNext = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }

    try {
      const floorsPayload = floorUnitSelections.reduce((accumulator, selection) => {
        const existing = accumulator.find(
          (item) => item.floorId === selection.floor.id,
        );

        if (existing) {
          if (!existing.unitIds.includes(selection.unit.id)) {
            existing.unitIds.push(selection.unit.id);
          }
          return accumulator;
        }

        accumulator.push({
          floorId: selection.floor.id,
          unitIds: [selection.unit.id],
        });
        return accumulator;
      }, [] as { floorId: string; unitIds: string[] }[]);

      if (taskId) {
        await updateTaskMutation.mutateAsync({
          taskId: taskId as string,
          payload: {
            title: title.trim(),
            description: description.trim(),
            priority: priority.toLowerCase(),
            dueDate: dueDate.trim() || formatDate(new Date()),
            estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
            allowSubTaskCreation,
            ...(floorsPayload.length > 0 && { floors: floorsPayload }),
          },
        });
        toast.success("Task updated successfully!");
        router.back();
        return;
      }

      const response = await createTaskMutation.mutateAsync({
        projectId,
        title: title.trim(),
        description: description.trim(),
        priority: priority.toLowerCase(),
        dueDate: dueDate.trim() || formatDate(new Date()),
        estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
        allowSubTaskCreation,
        floors: floorsPayload,
      });

      toast.success(isSubtaskMode ? "Subtask created successfully!" : "Task created successfully!");
      // Send task details to draft so AssignTaskScreen can use it or pass taskId directly
      setTaskDraft({
        title: title.trim(),
        location: `${projectProfile?.name || "Project"} - ${floorUnitSelections[0].floor.name}`,
        description: description.trim(),
        priority: priority,
        dueDate: dueDate.trim() || formatDate(new Date()),
      });

      // You can pass the newly created taskId to the next screen if needed
      router.replace({
        pathname: "/screens/company/task",
        params: { taskId: response.id, projectId },
      });
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const projectName = projectProfile?.name || "";

  return (
    <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={['top','left',"right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={14}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 36 }}
        >
          <BackTitleHeader
            title={
              taskId
                ? "Update Task"
                : isSubtaskMode
                  ? "Create New Subtask"
                  : "Create New Task"
            }
            onBack={() => router.back()}
          />

          <View className="mt-8 px-5">
            <TaskFormField
              label="Task Title"
              placeholder="Enter task title"
              value={title}
              onChangeText={setTitle}
            />

            <View className="mt-4">
              <TaskFormField
                label="Project"
                placeholder={isProjectLoading ? "Loading..." : "Project title"}
                value={projectName}
                onChangeText={() => { }} // Read-only based on project context
              />
            </View>

            <TaskFloorUnitMultiSelect
              projectId={projectId}
              floors={floors}
              isLoading={isFloorsLoading}
              initialSelections={editTaskFloorUnits ? JSON.parse(editTaskFloorUnits) : []}
              onChange={setFloorUnitSelections}
              readonly={!!taskId}
            />

            <View className="mt-4">
              <TaskFormField
                label="Description"
                placeholder="Task description"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1">
                <TaskFormField
                  label="Priority"
                  value={priority}
                  onPress={() => setShowPrioritySheet(true)}
                  onChangeText={() => { }}
                />
              </View>
              <View className="flex-1">
                <TaskFormField
                  label="Due Date (Optional)"
                  placeholder="YYYY-MM-DD"
                  value={dueDate}
                  onChangeText={setDueDate}
                  onPress={() => setShowDueDatePicker(true)}
                />
              </View>
            </View>

            <View className="mt-4">
              <TaskFormField
                label="Estimated Hours (Optional)"
                placeholder="e.g. 5"
                value={estimatedHours}
                onChangeText={setEstimatedHours}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setAllowSubTaskCreation((value) => !value)}
              className="mt-4 flex-row items-center rounded-[12px] border border-[#D7DEE7] bg-white px-4 py-4"
            >
              <View
                className={`h-6 w-6 items-center justify-center rounded-[7px] border ${
                  allowSubTaskCreation
                    ? "border-[#1E5371] bg-[#1E5371]"
                    : "border-[#C9D3DF] bg-white"
                }`}
              >
                {allowSubTaskCreation ? (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : null}
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-medium text-[#1A212B]">
                  Allow Subtask Creation
                </Text>
                <Text className="mt-1 text-[12px] text-[#667085]">
                  Turn off to block creating subtasks under this task.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNext}
              disabled={taskId ? updateTaskMutation.isPending : createTaskMutation.isPending}
              className={`mt-5 h-[56px] items-center justify-center rounded-[10px] ${
                (taskId ? updateTaskMutation.isPending : createTaskMutation.isPending)
                  ? "bg-[#1E5371]/70"
                  : "bg-[#1E5371]"
                }`}
            >
              {(taskId ? updateTaskMutation.isPending : createTaskMutation.isPending) ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[16px] font-medium text-[#F4F8FA]">
                  {taskId ? "Update" : isSubtaskMode ? "Create Subtask" : "Create Task"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
        {showDueDatePicker ? (
          <DateTimePicker
            value={dueDateValue}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDueDateChange}
          />
        ) : null}
      </KeyboardAvoidingView>

      {/* Priority Selection Modal */}
      <Modal
        visible={showPrioritySheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrioritySheet(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-center items-center p-5"
          onPress={() => setShowPrioritySheet(false)}
        >
          <Pressable className="bg-white w-full rounded-2xl p-6">
            <Text className="text-[18px] font-semibold text-[#1A212B] mb-5 text-center">
              Select Priority
            </Text>

            {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => {
                  setPriority(level);
                  setShowPrioritySheet(false);
                }}
                className={`py-4 rounded-xl mb-3 items-center border ${priority === level
                  ? "border-[#1E5371] bg-[#1E5371]/10"
                  : "border-[#E5E7EB]"
                  }`}
              >
                <Text className={`text-[16px] font-medium ${priority === level ? "text-[#1E5371]" : "text-[#4B5563]"
                  }`}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}
