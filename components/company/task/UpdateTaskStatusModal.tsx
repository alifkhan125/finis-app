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
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            paddingHorizontal: 20,
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#DCE3EA",
                backgroundColor: "#FFFFFF",
                padding: 20,
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "600", color: "#2B2B2B" }}>
                Update Status
              </Text>
              {task ? (
                <Text style={{ marginTop: 8, fontSize: 14, color: "#667085" }}>{task.title}</Text>
              ) : null}

              <View style={{ marginTop: 20, gap: 12 }}>
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
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderColor: active ? tone.border : "#D6DCE3",
                        backgroundColor: active ? tone.bg : isOptionDisabled ? "#F1F5F9" : "#F8FAFC",
                        opacity: isOptionDisabled && !active ? 0.45 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "500",
                          color: active ? tone.text : isOptionDisabled ? "#94A3B8" : "#2B2B2B",
                        }}
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
                style={{
                  marginTop: 20,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#D6DCE3",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: "500", color: "#2B2B2B" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
