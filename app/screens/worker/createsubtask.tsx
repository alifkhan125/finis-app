import BackTitleHeader from "@/components/common/BackTitleHeader";
import TaskFormField from "@/components/company/task/TaskFormField";
import { useCreateWorkerSubTaskMutation } from "@/hooks/worker/tasks";
import type { Floor, Room } from "@/types/company.types";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type TaskFloorParam = {
  id: string;
  name: string;
  floorNumber?: number;
  units: {
    id: string;
    name: string;
  }[];
};

type TaskFloorUnitSelection = {
  floor: Floor;
  unit: Room;
};

export default function WorkerCreateSubtaskRoute() {
  const { taskId, taskTitle, floorsJson, selectedFloorId, selectedUnitId } = useLocalSearchParams<{
    taskId?: string;
    taskTitle?: string;
    floorsJson?: string;
    selectedFloorId?: string;
    selectedUnitId?: string;
  }>();

  const resolvedTaskId = Array.isArray(taskId) ? taskId[0] : taskId;
  const resolvedTaskTitle = Array.isArray(taskTitle) ? taskTitle[0] : taskTitle;
  const resolvedFloorsJson = Array.isArray(floorsJson) ? floorsJson[0] : floorsJson;
  const resolvedSelectedFloorId = Array.isArray(selectedFloorId) ? selectedFloorId[0] : selectedFloorId;
  const resolvedSelectedUnitId = Array.isArray(selectedUnitId) ? selectedUnitId[0] : selectedUnitId;

  const parsedFloors = useMemo<TaskFloorParam[]>(() => {
    if (!resolvedFloorsJson) return [];
    try {
      return JSON.parse(resolvedFloorsJson);
    } catch {
      return [];
    }
  }, [resolvedFloorsJson]);

  const floors = useMemo<Floor[]>(
    () =>
      parsedFloors.map((floor) => ({
        id: floor.id,
        name: floor.name,
        floorNumber: floor.floorNumber ?? 0,
        status: "",
        progress: 0,
      })),
    [parsedFloors],
  );

  const unitsByFloor = useMemo<Record<string, Room[]>>(
    () =>
      Object.fromEntries(
        parsedFloors.map((floor) => [
          floor.id,
          floor.units.map((unit) => ({
            id: unit.id,
            name: unit.name,
            roomNumber: 0,
            status: "",
            progress: 0,
            type: null,
          })),
        ]),
      ),
    [parsedFloors],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [showPrioritySheet, setShowPrioritySheet] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [dueDateValue, setDueDateValue] = useState(new Date());
  const [estimatedHours, setEstimatedHours] = useState("");

  const initialSelections = useMemo<TaskFloorUnitSelection[]>(() => {
    if (!resolvedSelectedFloorId || !resolvedSelectedUnitId) return [];

    const floor = floors.find((item) => item.id === resolvedSelectedFloorId);
    const unit = unitsByFloor[resolvedSelectedFloorId]?.find(
      (item) => item.id === resolvedSelectedUnitId,
    );

    if (!floor || !unit) return [];

    return [{ floor, unit }];
  }, [floors, resolvedSelectedFloorId, resolvedSelectedUnitId, unitsByFloor]);
  const floorUnitSelections = initialSelections;

  const createSubTaskMutation = useCreateWorkerSubTaskMutation(resolvedTaskId);

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

  const handleCreate = async () => {
    if (!resolvedTaskId) {
      toast.error("Task ID is missing");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a sub task title");
      return;
    }
    if (!floorUnitSelections.length) {
      toast.error("Please select at least one floor and unit");
      return;
    }

    try {
      await createSubTaskMutation.mutateAsync({
        unitId: floorUnitSelections[0].unit.id,
        title: title.trim(),
        description: description.trim(),
        priority: priority.toLowerCase(),
        dueDate: dueDate.trim() || formatDate(new Date()),
        estimatedHours: estimatedHours.trim() ? Number(estimatedHours) : undefined,
      });

      toast.success("Subtask created successfully");
      router.replace("/worker/tasks");
    } catch (error) {
      // mutation handles error upstream if needed
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={["top", "left", "right"]}>
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
            title="Create New Subtask"
            onBack={() => router.back()}
          />

          <View className="mt-8 px-5">
            {resolvedTaskTitle ? (
              <View className="mb-4 rounded-[14px] border border-[#D7DEE7] bg-[#F7F9FB] px-4 py-3">
                <Text className="text-[12px] text-[#667085]">Parent Task</Text>
                <Text className="mt-1 text-[16px] font-semibold text-[#26313E]">
                  {resolvedTaskTitle}
                </Text>
              </View>
            ) : null}

            <TaskFormField
              label="Sub Task Title"
              placeholder="Enter sub task title"
              value={title}
              onChangeText={setTitle}
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
                  onChangeText={() => {}}
                />
              </View>
              <View className="flex-1">
                <TaskFormField
                  label="Due Date"
                  placeholder="YYYY-MM-DD"
                  value={dueDate}
                  onChangeText={setDueDate}
                  onPress={() => setShowDueDatePicker(true)}
                />
              </View>
            </View>

            <TaskFormField
              label="Estimated Hours"
              placeholder="Enter estimated hours"
              value={estimatedHours}
              onChangeText={setEstimatedHours}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCreate}
              disabled={createSubTaskMutation.isPending}
              className={`mt-5 h-[56px] items-center justify-center rounded-[10px] ${
                createSubTaskMutation.isPending ? "bg-[#1E5371]/70" : "bg-[#1E5371]"
              }`}
            >
              {createSubTaskMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-[16px] font-medium text-[#F4F8FA]">
                  Create Subtask
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

      <Modal
        visible={showPrioritySheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrioritySheet(false)}
      >
        <Pressable
          className="flex-1 items-center justify-center bg-black/40 p-5"
          onPress={() => setShowPrioritySheet(false)}
        >
          <Pressable className="w-full rounded-2xl bg-white p-6">
            <Text className="mb-5 text-center text-[18px] font-semibold text-[#1A212B]">
              Select Priority
            </Text>

            {(["LOW", "MEDIUM", "HIGH"] as const).map((item) => (
              <TouchableOpacity
                key={item}
                activeOpacity={0.85}
                onPress={() => {
                  setPriority(item);
                  setShowPrioritySheet(false);
                }}
                className={`mb-3 rounded-[12px] border px-4 py-4 ${
                  priority === item
                    ? "border-[#1E5371] bg-[#EDF5F8]"
                    : "border-[#D8DEE5] bg-[#F8FAFC]"
                }`}
              >
                <Text className="text-[15px] font-medium text-[#26313E]">{item}</Text>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
