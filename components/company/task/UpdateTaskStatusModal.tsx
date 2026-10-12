import React from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { TaskItem, TaskStatus } from "./types";

const statusOptions: TaskStatus[] = ["Pending", "In Progress", "Completed"];

const tones: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  Pending: { bg: "#FFF4E8", text: "#E58B18", border: "#F4D1A7" },
  "In Progress": { bg: "#E8F0FF", text: "#225CFF", border: "#C8D7FF" },
  Inactive: { bg: "#F2F4F7", text: "#667085", border: "#D0D5DD" },
  Completed: { bg: "#E8F5EE", text: "#0F8A61", border: "#BEE3D2" },
  Review: { bg: "#F1EDFF", text: "#6941C6", border: "#D9CCFF" },
  Revision: { bg: "#FFF1F3", text: "#C01048", border: "#FDA4AF" },
};

type UpdateTaskStatusModalProps = {
  visible: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onSelectStatus: (status: TaskStatus) => void;
};

function isTransitionDisabled(currentStatus: TaskStatus | undefined, targetStatus: TaskStatus): boolean {
  if (!currentStatus) return true;
  return currentStatus === targetStatus;
}


export default function UpdateTaskStatusModal({
  visible,
  task,
  onClose,
  onSelectStatus,
}: UpdateTaskStatusModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-center bg-black/30 px-5">
          <TouchableWithoutFeedback>
            <View className="rounded-[24px] border border-[#DCE3EA] bg-white p-5">
              <Text className="text-[20px] font-semibold text-[#2B2B2B]">
                Update Status
              </Text>
              {task ? (
                <Text className="mt-2 text-[14px] text-[#667085]">{task.title}</Text>
              ) : null}

              <View className="mt-5 gap-3">
                {statusOptions.map((status) => {
                  const active = task?.status === status;
                  const tone = tones[status];
                  const isOptionDisabled = isTransitionDisabled(task?.status, status);

                  return (
                    <TouchableOpacity
                      key={status}
                      activeOpacity={0.85}
                      disabled={isOptionDisabled}
                      onPress={() => onSelectStatus(status)}
                      className="rounded-[14px] border px-4 py-3"
                      style={{
                        borderColor: active ? tone.border : "#D6DCE3",
                        backgroundColor: active ? tone.bg : isOptionDisabled ? "#F1F5F9" : "#F8FAFC",
                        opacity: isOptionDisabled && !active ? 0.45 : 1,
                      }}
                    >
                      <Text
                        className="text-[15px] font-medium"
                        style={{ color: active ? tone.text : isOptionDisabled ? "#94A3B8" : "#2B2B2B" }}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                className="mt-5 h-[52px] items-center justify-center rounded-[14px] border border-[#D6DCE3] bg-white"
              >
                <Text className="text-[15px] font-medium text-[#2B2B2B]">Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
