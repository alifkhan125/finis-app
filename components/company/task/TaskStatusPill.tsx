import React from "react";
import { Text, View } from "react-native";
import { TaskStatus } from "./types";

type TaskStatusPillProps = {
  status: TaskStatus;
};

const toneByStatus: Record<TaskStatus, { bg: string; text: string }> = {
  "In Progress": { bg: "#D9E5FF", text: "#225CFF" },
  Pending: { bg: "#FBE8D2", text: "#E58B18" },
  Inactive: { bg: "#F2F4F7", text: "#667085" },
  Completed: { bg: "#D6E6E1", text: "#0F8A61" },
  Review: { bg: "#E9E5FF", text: "#6941C6" },
  Revision: { bg: "#FFE4E8", text: "#C01048" },
};

export default function TaskStatusPill({ status }: TaskStatusPillProps) {
  const tone = toneByStatus[status];

  return (
    <View
      className="rounded-full px-3 py-1.5"
      style={{ backgroundColor: tone.bg }}
    >
      <Text className="text-[13px] leading-[16px]" style={{ color: tone.text }}>
        {status}
      </Text>
    </View>
  );
}
