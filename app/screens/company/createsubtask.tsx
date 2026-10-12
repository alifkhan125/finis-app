import BackTitleHeader from "@/components/common/BackTitleHeader";
import TaskFormField from "@/components/company/task/TaskFormField";
import TaskFloorUnitMultiSelect, {
  TaskFloorUnitSelection,
} from "@/components/company/task/TaskFloorUnitMultiSelect";
import { setTaskDraft } from "@/components/company/task/taskStore";
import {
  useCreateSubTaskMutation,
  useUpdateSubTaskMutation,
  useCreateTaskMutation,
  useTaskDetailsQuery,
  useTaskLocationsQuery,
  useProjectFloorsQuery,
  useProjectProfileQuery
} from "@/hooks/company/company";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useMemo, useCallback } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CreateSubtaskRoute() {
  const { projectId, parentTaskId, parentTaskTitle, editTaskTitle, editTaskDescription, editTaskPriority, editTaskDueDate, editTaskFloorUnits, editTaskEstimatedHours, taskId } = useLocalSearchParams<{
    projectId?: string;
    parentTaskId?: string;
    parentTaskTitle?: string;
    editTaskTitle?: string;
    editTaskDescription?: string;
    editTaskPriority?: "LOW" | "MEDIUM" | "HIGH";
    editTaskDueDate?: string;
    editTaskFloorUnits?: string;
    editTaskEstimatedHours?: string;
    taskId?: string;
  }>();
  const resolvedParentTaskTitle = Array.isArray(parentTaskTitle)
    ? parentTaskTitle[0]
    : parentTaskTitle;
  const isSubtaskMode = Boolean(resolvedParentTaskTitle);
  const resolvedParentTaskId = Array.isArray(parentTaskId)
    ? parentTaskId[0]
    : parentTaskId;

  const { data: projectProfile, isLoading: isProjectLoading } = useProjectProfileQuery(projectId);
  const { data: floors, isLoading: isFloorsLoading } = useProjectFloorsQuery(projectId);
  const { data: parentTaskLocations, isLoading: isParentTaskLoading } =
    useTaskLocationsQuery(isSubtaskMode ? resolvedParentTaskId : undefined);
  const { data: parentTaskDetails } =
    useTaskDetailsQuery(isSubtaskMode ? resolvedParentTaskId : undefined);

  const [title, setTitle] = useState(editTaskTitle ?? "");
  const [description, setDescription] = useState(editTaskDescription ?? "");

  const validPriorities = ["low", "medium", "high", "critical"];
  const initialPriority = validPriorities.includes(editTaskPriority?.toLowerCase() ?? "")
    ? editTaskPriority!.toUpperCase() as "LOW" | "MEDIUM" | "HIGH"
    : "MEDIUM";
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">(initialPriority);
  const [showPrioritySheet, setShowPrioritySheet] = useState(false);

  const [dueDate, setDueDate] = useState(editTaskDueDate ?? "");
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(editTaskDueDate ? new Date(editTaskDueDate) : new Date());

  const [estimatedHours, setEstimatedHours] = useState(editTaskEstimatedHours ?? '');

  const [floorUnitSelections, setFloorUnitSelections] = useState<TaskFloorUnitSelection[]>(
    editTaskFloorUnits ? JSON.parse(editTaskFloorUnits) : []
  );

  const createTaskMutation = useCreateTaskMutation();
  const createSubTaskMutation = useCreateSubTaskMutation(resolvedParentTaskId, projectId);
  const updateSubTaskMutation = useUpdateSubTaskMutation(taskId, resolvedParentTaskId, projectId);

  const subtaskFloorsSource = (() => {
    const locationFloors = parentTaskLocations?.floors ?? [];
    const detailFloors = parentTaskDetails?.floors ?? [];

    if (!locationFloors.length) {
      return detailFloors;
    }

    return locationFloors.map((locationFloor) => {
      const matchedDetailFloor = detailFloors.find(
        (detailFloor) => detailFloor.id === locationFloor.id,
      );

      return {
        ...locationFloor,
        units:
          locationFloor.units?.length
            ? locationFloor.units
            : matchedDetailFloor?.units ?? [],
      };
    });
  })();

  const availableFloors = isSubtaskMode && !taskId ? subtaskFloorsSource : floors;

  const unitsByFloor = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!availableFloors) return map;

    availableFloors.forEach((floor: any) => {
      if (floor.units && floor.units.length > 0) {
        map[floor.id] = floor.units;
      }
    });
    return map;
  }, [availableFloors]);

  const activeFloors = useMemo(() => {
    if (!availableFloors) return [];
    const floorsWithUnits = availableFloors.filter((floor) => {
      const units = unitsByFloor[floor.id];
      return units && units.length > 0;
    });
    return floorsWithUnits;
  }, [availableFloors, unitsByFloor]);

  const validateInitialSelections = useCallback(() => {
    if (!isSubtaskMode || !availableFloors?.length) return undefined;
    const selections = floorUnitSelections.filter((selection) => {
      const floorExists = availableFloors.find((f) => f.id === selection.floor.id);
      if (!floorExists) return false;
      const units = unitsByFloor[selection.floor.id];
      return units?.find((u) => u.id === selection.unit.id);
    });
    return selections.length > 0 ? selections : undefined;
  }, [isSubtaskMode, availableFloors, unitsByFloor]);

  const isSelectorLoading = isSubtaskMode ? isParentTaskLoading : isFloorsLoading;
  const isSubmitting = taskId
    ? updateSubTaskMutation.isPending
    : isSubtaskMode
      ? createSubTaskMutation.isPending
      : createTaskMutation.isPending;

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
      if (taskId) {
        await updateSubTaskMutation.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          priority: priority.toLowerCase(),
          unitIds: floorUnitSelections.map((selection) => selection.unit.id),
          dueDate: dueDate.trim() || formatDate(new Date()),
          estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
        });

        router.replace({
          pathname: "/screens/company/subtasks",
          params: {
            projectId,
            parentTaskId: resolvedParentTaskId,
            title: resolvedParentTaskTitle,
          },
        });
        return;
      } else if (isSubtaskMode) {
        await createSubTaskMutation.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          priority: priority.toLowerCase(),
          unitIds: floorUnitSelections.map((selection) => selection.unit.id),
          dueDate: dueDate.trim() || formatDate(new Date()),
          estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
        });

        router.replace({
          pathname: "/screens/company/subtasks",
          params: {
            projectId,
            parentTaskId: resolvedParentTaskId,
            title: resolvedParentTaskTitle,
          },
        });
        return;
      }

      const responses = [];
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

      const response = await createTaskMutation.mutateAsync({
        projectId,
        title: title.trim(),
        description: description.trim(),
        priority: priority.toLowerCase(),
        dueDate: dueDate.trim() || formatDate(new Date()),
        floors: floorsPayload,
      });

      toast.success("Task created successfully!");
      setTaskDraft({
        title: title.trim(),
        location: `${projectProfile?.name || "Project"} - ${floorUnitSelections[0].floor.name}`,
        description: description.trim(),
        priority: priority,
        dueDate: dueDate.trim() || formatDate(new Date()),
        estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
      });

      router.replace({
        pathname: "/screens/company/task",
        params: { taskId: response.id, projectId },
      });
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const projectName = projectProfile?.name || "";
  const insets = useSafeAreaInsets();
  return <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={['top', 'left', "right"]}>
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
              ? isSubtaskMode
                ? "Update Subtask"
                : "Update Task"
              : isSubtaskMode
                ? "Create New Subtask"
                : "Create New Task"
          }
          onBack={() => router.back()}
        />

        <View className="mt-8 px-5">
          <TaskFormField
            label={isSubtaskMode ? "Sub Task Title" : "Task Title"}
            placeholder={isSubtaskMode ? "Enter sub task title" : "Enter task title"}
            value={title}
            onChangeText={setTitle}
          />

          {/* <View className="mt-4">
              <TaskFormField
                label="Project"
                placeholder={isProjectLoading ? "Loading..." : "Project title"}
                value={projectName}
                onChangeText={() => { }} // Read-only based on project context
              />
            </View> */}

          <TaskFloorUnitMultiSelect
            projectId={projectId}
            floors={availableFloors}
            unitsByFloor={unitsByFloor}
            isLoading={isSelectorLoading}
            initialSelections={taskId ? (floorUnitSelections.length > 0 ? floorUnitSelections : undefined) : validateInitialSelections()}
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
            onPress={handleNext}
            disabled={isSubmitting}
            className={`mt-5 h-[56px] items-center justify-center rounded-[10px] ${isSubmitting ? "bg-[#1E5371]/70" : "bg-[#1E5371]"
              }`}
          >
            {isSubmitting ? (
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

  </SafeAreaView>;
}
