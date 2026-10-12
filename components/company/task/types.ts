export type TaskStatus = "In Progress" | "Pending" | "Completed" | "Review" | "Inactive" | "Revision";

export type TaskItem = {
  id: string;
  title: string;
  location: string;
  assignee: string;
  startDate: string;
  dueDate: string;
  status: TaskStatus;
  description?: string;
  priority?: string;
  projectId?: string;
  floorId?: string;
  floorName?: string;
  unitId?: string;
  unitName?: string;
  reportCount?: number;
  subTaskCount?: number;
  completedSubTaskCount?: number;
  assignedWorkerCount?: number;
  allowSubTaskCreation?: boolean;
  approvalDecision?: string | null;
  completionDecision?: string | null;
  rawStatus?: string;
  floorUnitSelections?: { floor: { id: string; name: string }; unit: { id: string; name: string } }[];
  estimatedHours?: number | null;
};
