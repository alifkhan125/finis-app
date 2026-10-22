import type { DocumentItem } from "@/components/company/documents/types";
import { AxiosError } from "axios";
import { api } from "@/lib/api/client";
import { appendImageToFormData } from "@/lib/uploads/image-upload";
import type { AdminCompaniesResponse } from "@/types/admin.types";
import type { AdminCompanyDetailResponse } from "@/types/admin.types";
import type { ApiResponse } from "@/types/auth.types";
import type {
  CreateCompanyPayload,
  CreateProjectPayload,
  CompanyContactsResponse,
  CompanyProjectsResponse,
  CreateCompanyResponse,
  ProjectFloorPlanResponse,
  ProjectProfileResponse,
  UpdateProjectPayload,
  UpdateCompanyPayload,
  ProjectAnalysisResponse,
  TasksListMeta,
  AvailableManagersResponse,
  CompanyProjectTeamMember,
  ProjectFloorsResponse,
  ProjectRoomsResponse,
  CreateTaskPayload,
  CreateSubTaskPayload,
  CreateSubTaskResponse,
  TaskListItem,
  TaskAssignee,
  TaskSubTaskListItem,
  TaskSubTasksResponse,
  SubTaskGroupItem,
} from "@/types/company.types";
function resolveMediaUrl(path: string | null) {
  return path;
}

type CompaniesParams = {
  page?: number;
  limit?: number;
};

type ProjectPriority = "LOW" | "MEDIUM" | "HIGH";

function normalizeProjectPriority(
  priority: string | undefined,
  status: string,
): ProjectPriority {
  const normalized = (priority ?? "").trim().toUpperCase();

  if (normalized === "HIGH") return "HIGH";
  if (normalized === "LOW") return "LOW";
  if (normalized === "MEDIUM" || normalized === "MEDUIM") return "MEDIUM";

  const normalizedStatus = (status ?? "").trim().toLowerCase();
  if (normalizedStatus === "active") return "HIGH";
  if (normalizedStatus === "pending") return "MEDIUM";

  return "LOW";
}

type CompanyDocumentApiItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSizeMb: number;
  uploadedAt: string;
  uploadedByUser: {
    id: string;
    fullName: string;
  } | null;
};

function buildCompanyFormData(payload: CreateCompanyPayload | UpdateCompanyPayload) {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("industry", payload.industry);
  formData.append("description", payload.description);
  formData.append("phone", payload.phone);
  formData.append("email", payload.email);
  formData.append("website", payload.website);
  formData.append("address", payload.address);
  formData.append("revenue", payload.revenue);
  formData.append("projectLevel", payload.projectLevel);

  appendImageToFormData(formData, "logo", payload.logo ?? null);

  return formData;
}

export async function getCompanies(params: CompaniesParams = {}) {
  const { page = 1, limit = 10 } = params;
  const { data } = await api.get<AdminCompaniesResponse>("/admin/companies", {
    params: { page, limit },
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to load companies");
  }

  return {
    data: data.data.map((company) => ({
      ...company,
      logoUrl: company.logoUrl,
    })),
    meta: data.meta,
  };
}

export async function getCompany(id: string) {
  const { data } = await api.get<AdminCompanyDetailResponse>(
    `/admin/companies/${id}`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load company");
  }

  return {
    ...data.data,
    logoUrl: data.data.logoUrl,
  };
}

export async function getCompanyProjects(id: string) {
  const { data } = await api.get<CompanyProjectsResponse>(
    `/admin/companies/${id}/projects`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load projects");
  }

  return data.data.map((project) => ({
    ...project,
    priority: normalizeProjectPriority(
      (project as { priority?: string }).priority,
      project.status,
    ),
    teamMembers: project.teamMembers.map((member) => ({
      ...member,
      user: {
        ...member.user,
        avatarUrl: member.user.avatarUrl,
      },
    })),
  }));
}

export async function getCompanyContacts(id: string) {
  const { data } = await api.get<CompanyContactsResponse>(
    `/admin/companies/${id}/contacts`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load contacts");
  }

  return data.data.map((contact) => ({
    ...contact,
    avatarUrl: contact.avatarUrl,
  }));
}

export async function createCompany(payload: CreateCompanyPayload) {
  const formData = buildCompanyFormData(payload);

  try {
    const { data } = await api.post<CreateCompanyResponse>(
      "/admin/companies",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (!data.success) {
      throw new Error(data.message || "Failed to create company");
    }

    return data.data;
  } catch (error) {
    throw error;
  }
}

export async function updateCompany(
  id: string,
  payload: UpdateCompanyPayload,
) {
  const formData = buildCompanyFormData(payload);

  try {
    const { data } = await api.put<CreateCompanyResponse>(
      `/admin/companies/${id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    if (!data.success) {
      throw new Error(data.message || "Failed to update company");
    }

    return data.data;
  } catch (error) {
    throw error;
  }
}

export async function deleteCompany(id: string) {
  const { data } = await api.delete<ApiResponse<any>>(
    `/admin/companies/${id}`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to delete company");
  }

  return data;
}

export async function deleteProject(id: string) {
  const { data } = await api.delete<ApiResponse<any>>(
    `/admin/projects/${id}`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to delete project");
  }

  return data;
}

export async function createProject(payload: CreateProjectPayload) {
  const { data } = await api.post<ProjectProfileResponse>("/admin/projects", payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to create project");
  }

  return data.data;
}

export async function getProjectProfile(id: string) {
  const { data } = await api.get<ProjectProfileResponse>(
    `/admin/projects/${id}/profile`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load project profile");
  }

  return {
    ...data.data,
    priority: normalizeProjectPriority(data.data.priority, data.data.status),
    client: {
      ...data.data.client,
      logoUrl: resolveMediaUrl(data.data.client.logoUrl),
    },
  };
}

export async function getProjectFloorPlan(id: string) {
  const { data } = await api.get<ProjectFloorPlanResponse>(
    `/admin/projects/${id}/floor-plan`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load floor plan");
  }

  return data.data;
}

export async function updateProject(id: string, payload: UpdateProjectPayload) {
  const { data } = await api.put<ProjectProfileResponse>(`/admin/projects/${id}`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to update project");
  }

  return data.data;
}

export async function getCompanyDocuments(id: string): Promise<DocumentItem[]> {
  try {
    const { data } = await api.get<{
      success: boolean;
      statusCode: number;
      message: string;
      data: CompanyDocumentApiItem[];
    }>(`/admin/companies/${id}/documents`);

    if (!data.success) {
      throw new Error(data.message || "Failed to load company documents");
    }

    return data.data.map((document) => ({
      id: document.id,
      fileName: document.fileName,
      fileType: document.fileType,
      fileSize: `${document.fileSizeMb} MB`,
      uploadedBy: document.uploadedByUser?.fullName ?? "Unknown",
      uploadedDate: new Date(document.uploadedAt).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
      fileUrl: resolveMediaUrl(document.fileUrl) ?? "",
    }));
  } catch (error) {
    if (error instanceof AxiosError) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        "Failed to load company documents";
      throw new Error(message);
    }

    throw error;
  }
}

export async function getProjectDocuments(
  projectId: string,
  type?: "project" | "task" | "expense",
): Promise<DocumentItem[]> {
  const { data } = await api.get<ApiResponse<{
    documents?: Array<DocumentItem | CompanyDocumentApiItem>;
    projectDocuments?: Array<DocumentItem | CompanyDocumentApiItem>;
    taskDocuments?: Array<DocumentItem | CompanyDocumentApiItem>;
  } | Array<DocumentItem | CompanyDocumentApiItem>>>(
    `/admin/projects/${projectId}/documents`,
    { params: type ? { type } : undefined },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load project documents");
  }

  const documents = Array.isArray(data.data) ? data.data : data.data?.documents;

  return (documents ?? []).map((document: DocumentItem | CompanyDocumentApiItem) => {
    const apiDocument = document as CompanyDocumentApiItem;
    const viewDocument = document as DocumentItem;

    return {
      id: viewDocument.id ?? apiDocument.id,
      fileName: viewDocument.fileName ?? apiDocument.fileName,
      fileType: viewDocument.fileType ?? apiDocument.fileType,
      fileSize: viewDocument.fileSize ?? `${apiDocument.fileSizeMb ?? 0} MB`,
      uploadedBy:
        viewDocument.uploadedBy ??
        apiDocument.uploadedByUser?.fullName ??
        "Unknown",
      uploadedDate:
        viewDocument.uploadedDate ??
        (apiDocument.uploadedAt
          ? new Date(apiDocument.uploadedAt).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            year: "numeric",
          })
          : "N/A"),
      fileUrl: resolveMediaUrl(viewDocument.fileUrl ?? apiDocument.fileUrl) ?? "",
    };
  });
}

export async function getProjectAnalysis(id: string) {
  const { data } = await api.get<ProjectAnalysisResponse>(
    `/admin/projects/${id}/analysis`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load project analysis");
  }

  return data.data;
}

type GetTasksParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  projectId?: string;
};

type TaskResponseFloorUnit = {
  id: string;
  name: string;
};

type TaskResponseFloor = {
  id: string;
  name: string;
  floorNumber: number;
  units: TaskResponseFloorUnit[];
};

type BackendTaskResponseItem = {
  project: {
    id: string;
    name: string;
  } | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    allowSubTaskCreation?: boolean;
    approvalDecision: string | null;
    approvalNotes: string | null;
    completionDecision: string | null;
    completionNotes: string | null;
    dueDate: string | null;
    estimatedHours?: number | null;
    price?: number;
  };
  floors: TaskResponseFloor[];
  location?: string;
  subTaskCount?: number;
  completedSubTaskCount?: number;
  assignedWorkerCount?: number;
  _count?: {
    reports?: number;
    subTasks?: number;
  };
  taskUnits?: Array<{
    unit: {
      id: string;
      name: string;
      floorId?: string;
      floor?: { id: string; name: string; floorNumber?: number };
    };
  }>;
  estimatedHours?: number | null;
  price?: number;
};

type BackendSubTaskResponseItem = {
  id: string;
  title: string;
  description: string | null;
  priority?: string | null;
  dueDate?: string | null;
  status: string;
  approvalDecision: string;
  createdAt?: string;
  submittedAt?: string | null;
  completedAt?: string | null;
  estimatedHours?: number | null;
  price?: number;
  unit: {
    id: string;
    name: string;
    floorId?: string;
    floor?: { id: string; name: string; floorNumber?: number };
  } | null;
  subTaskUnits?: Array<{
    unit: {
      id: string;
      name: string;
      floorId?: string;
      floor?: { id: string; name: string; floorNumber?: number };
    };
  }>;
  units?: Array<{
    id: string;
    name: string;
    floorId?: string;
    floor?: { id: string; name: string; floorNumber?: number };
  }>;
  taskAssignee?: {
    id: string;
    user: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      role: string;
    } | null;
    unit: {
      id: string;
      name: string;
      floorId?: string;
      floor?: { id: string; name: string; floorNumber?: number };
    } | null;
  } | null;
  creator?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  _count?: {
    reports: number;
    inventories: number;
  };
};

function mapBackendTaskResponse(task: BackendTaskResponseItem): TaskListItem {
  const firstFloor = task.floors?.[0] ?? null;
  const firstUnit = firstFloor?.units?.[0] ?? null;

  return {
    id: task.task.id,
    projectId: task.project?.id ?? "",
    floorId: firstFloor?.id ?? "",
    roomId: firstUnit?.id ?? "",
    assignedTo: "",
    createdBy: "",
    title: task.task.title,
    description: task.task.description ?? "",
    priority: task.task.priority,
    status: task.task.status,
    dueDate: task.task.dueDate ?? "",
    estimatedHours: task.task.estimatedHours ?? task.estimatedHours ?? null,
    price: task.task.price ?? task.price,
    actualHours: null,
    createdAt: task.task.dueDate ?? new Date().toISOString(),
    updatedAt: task.task.dueDate ?? new Date().toISOString(),
    project: task.project ? { id: task.project.id, name: task.project.name } : { id: "", name: "" },
    floor: firstFloor ? { id: firstFloor.id, name: firstFloor.name } : { id: "", name: "" },
    room: firstUnit ? { id: firstUnit.id, name: firstUnit.name } : { id: "", name: "" },
    assignee: {
      id: "",
      fullName: "",
      avatarUrl: null,
      role: "",
    } as TaskAssignee,
    _count: {
      reports: task._count?.reports ?? 0,
      subTasks: task.subTaskCount ?? 0,
    },
    location: task.location ?? "",
    subTaskCount: task.subTaskCount ?? 0,
    completedSubTaskCount: task.completedSubTaskCount ?? 0,
    assignedWorkerCount: task.assignedWorkerCount ?? 0,
    allowSubTaskCreation: task.task.allowSubTaskCreation ?? false,
    approvalDecision: task.task.approvalDecision,
    completionDecision: task.task.completionDecision,
    floorUnitSelections: task.taskUnits 
      ? task.taskUnits
          .filter(tu => tu.unit && tu.unit.floorId)
          .map(tu => ({
            floor: {
              id: tu.unit.floor?.id || tu.unit.floorId || "",
              name: tu.unit.floor?.name || ""
            },
            unit: {
              id: tu.unit.id,
              name: tu.unit.name
            }
          }))
      : task.floors?.flatMap(floor => 
          (floor.units || []).map(unit => ({
            floor: { id: floor.id, name: floor.name },
            unit: { id: unit.id, name: unit.name }
          }))
        ) || [],
  } as TaskListItem;
}

function mapBackendSubTaskResponse(task: BackendSubTaskResponseItem): TaskSubTaskListItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    status: task.status,
    approvalDecision: task.approvalDecision,
    createdAt: task.createdAt ?? new Date().toISOString(),
    submittedAt: task.submittedAt,
    completedAt: task.completedAt,
    estimatedHours: task.estimatedHours,
    price: task.price,
    unit: task.unit,
    subTaskUnits: task.subTaskUnits,
    units: task.units,
    taskAssignee: task.taskAssignee ?? null,
    creator: task.creator ?? null,
    _count: task._count ?? { reports: 0, inventories: 0 },
  };
}

export async function getTasks(params: GetTasksParams = {}): Promise<{
  data: TaskListItem[];
  meta: TasksListMeta;
}> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: BackendTaskResponseItem[];
    meta: TasksListMeta;
  }>("/admin/tasks", {
    params,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to load tasks");
  }

  return {
    data: data.data.map((task) => mapBackendTaskResponse(task)),
    meta: data.meta,
  };
}

export async function getTaskSubTasks(taskId: string, search?: string): Promise<{
  data: TaskSubTaskListItem[];
}> {
  const url = search
    ? `/admin/tasks/${taskId}/subtasks?search=${encodeURIComponent(search)}`
    : `/admin/tasks/${taskId}/subtasks`;
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: BackendSubTaskResponseItem[];
  }>(url);

  if (!data.success) {
    throw new Error(data.message || "Failed to load subtasks");
  }

  return {
    data: data.data.map((subTask) => mapBackendSubTaskResponse(subTask)),
  };
}

export async function getSubTaskGroups(params: {
  taskId?: string;
  projectId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: SubTaskGroupItem[];
  meta: TasksListMeta;
}> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: SubTaskGroupItem[];
    meta: TasksListMeta;
  }>("/admin/subtasks/groups", { params });

  if (!data.success) {
    throw new Error(data.message || "Failed to load subtask groups");
  }

  return {
    data: data.data,
    meta: data.meta,
  };
}

export async function getSubTasksByGroup(
  title: string,
  params: {
    taskId?: string;
    projectId?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
): Promise<{
  title: string;
  data: TaskSubTaskListItem[];
  meta: TasksListMeta;
}> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    title: string;
    data: BackendSubTaskResponseItem[];
    meta: TasksListMeta;
  }>(`/admin/subtasks/groups/${encodeURIComponent(title)}`, { params });

  if (!data.success) {
    throw new Error(data.message || "Failed to load grouped subtasks");
  }

  return {
    title: data.title,
    data: data.data.map((subTask) => mapBackendSubTaskResponse(subTask)),
    meta: data.meta,
  };
}

export async function getTaskLocations(taskId: string): Promise<{
  floors: Array<{
    id: string;
    name: string;
    units: Array<{ id: string; name: string }>;
  }>;
}> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: {
      floors: Array<{
        id: string;
        name: string;
        units: Array<{ id: string; name: string }>;
      }>;
    };
  }>(`/admin/tasks/${taskId}/locations`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load task locations");
  }

  return data.data;
}

export async function updateTaskStatusApi(id: string, status: string) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${id}/status`, { status });

  if (!data.success) {
    throw new Error(data.message || "Failed to update task status");
  }

  return data.data;
}

export async function createProjectFloor(projectId: string, name: string) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/floors`, { name });

  if (!data.success) {
    throw new Error(data.message || "Failed to add floor");
  }

  return data.data;
}

export async function createProjectFloorRooms(
  projectId: string,
  floorId: string,
  startRoomNumber: string,
  endRoomNumber: string,
) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/floors/${floorId}/rooms`, {
    startRoomNumber,
    endRoomNumber,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to add rooms");
  }

  return data.data;
}

export async function updateProjectFloor(
  projectId: string,
  floorId: string,
  payload: { name: string; status: string; progress: number }
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/floors/${floorId}`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to update floor");
  }

  return data.data;
}

export async function updateProjectRoom(
  projectId: string,
  roomId: string,
  payload: {
    name: string;
    type: string;
    sizeSqft: number;
    status: string;
    progress: number;
  }
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/rooms/${roomId}`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to update room");
  }

  return data.data;
}

export async function deleteProjectFloor(projectId: string, floorId: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/floors/${floorId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to delete floor");
  }

  return data.data;
}

export async function deleteProjectRoom(projectId: string, roomId: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/rooms/${roomId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to delete room");
  }

  return data.data;
}

export async function getAvailableManagers() {
  const { data } = await api.get<AvailableManagersResponse>(
    "/admin/team/available-managers"
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load available managers");
  }

  return data.data.map((manager) => ({
    ...manager,
    avatarUrl: resolveMediaUrl(manager.avatarUrl),
  }));
}

export async function getProjectTeam(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any[];
  }>(`/admin/projects/${projectId}/team/workers`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load project team");
  }

  return {
    workers: data.data.map((worker: any) => ({
      ...worker,
      avatarUrl: resolveMediaUrl(worker.avatarUrl),
    })),
  };
}

export async function addProjectManager(projectId: string, userId: string) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message: string;
      data: any;
    }>(`/admin/projects/${projectId}/team/managers`, { userId });

    if (!data.success) {
      throw new Error(data.message || "Failed to add manager");
    }

    return data.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

export async function getProjectFloors(projectId: string) {
  const { data } = await api.get<ProjectFloorsResponse>(
    `/admin/projects/${projectId}/floors`
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load floors");
  }

  return data.data;
}

export async function getFloorRooms(projectId: string, floorId: string) {
  const { data } = await api.get<ProjectRoomsResponse>(
    `/admin/projects/${projectId}/floors/${floorId}/units`
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load units");
  }

  return data.data;
}

export async function reviewTaskApprovalApi(
  taskId: string,
  reviewDecision: "approved" | "rejected",
  reviewDescription?: string,
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${taskId}/approval`, {
    reviewDecision,
    reviewDescription,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to review task approval");
  }

  return data.data;
}

export async function reviewTaskCompletionApi(
  taskId: string,
  reviewDecision: "approved" | "rejected",
  reviewDescription?: string,
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${taskId}/completion-review`, {
    reviewDecision,
    reviewDescription,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to review task completion");
  }

  return data.data;
}

export async function reviewSubTaskApprovalApi(
  taskId: string,
  subTaskId: string,
  reviewDecision: "approved" | "rejected",
  reviewDescription?: string,
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${taskId}/subtasks/${subTaskId}/approval`, {
    reviewDecision,
    reviewDescription,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to review sub task");
  }

  return data.data;
}

export async function reviewSubTaskReportApi(
  subTaskId: string,
  payload: {
    reviewDecision: "approved" | "rejected";
    reviewDescription?: string;
    reviewAttachmentUrl?: string;
    expenseAmount?: number;
  },
  file?: { uri: string; name?: string | null; type?: string | null },
) {
  const formData = new FormData();
  formData.append("reviewDecision", payload.reviewDecision);

  if (payload.reviewDescription) {
    formData.append("reviewDescription", payload.reviewDescription);
  }

  if (payload.reviewAttachmentUrl) {
    formData.append("reviewAttachmentUrl", payload.reviewAttachmentUrl);
  }

  if (typeof payload.expenseAmount === "number" && Number.isFinite(payload.expenseAmount)) {
    formData.append("expenseAmount", String(payload.expenseAmount));
  }

  if (file?.uri) {
    formData.append("file", {
      uri: file.uri,
      name: file.name || "review-attachment",
      type: file.type || "application/octet-stream",
    } as any);
  }

  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/subtasks/${subTaskId}/report-review`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to review sub task report");
  }

  return data.data;
}

export async function createTask(payload: CreateTaskPayload): Promise<TaskListItem> {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: BackendTaskResponseItem;
  }>(
    `/admin/tasks`,
    payload
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to create task");
  }

  return mapBackendTaskResponse(data.data);
}

export async function removeProjectManager(projectId: string, userId: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/team/${userId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to remove manager");
  }

  return data.data;
}

export async function getProjectManagers(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any[];
  }>(`/admin/projects/${projectId}/team/managers`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load project managers");
  }

  return data.data.map((manager: any) => ({
    ...manager,
    avatarUrl: resolveMediaUrl(manager.avatarUrl),
  }));
}

export async function getAvailableWorkers() {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any[];
  }>("/admin/team/available-workers");

  if (!data.success) {
    throw new Error(data.message || "Failed to load available workers");
  }

  return data.data.map((worker: any) => ({
    ...worker,
    avatarUrl: resolveMediaUrl(worker.avatarUrl),
  }));
}

export async function assignProjectSchedule(projectId: string, payload: { userIds: string[]; startTime: string; endTime: string }) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message: string;
      data: any;
    }>(`/admin/projects/${projectId}/schedule/assign`, payload);

    if (!data.success) {
      throw new Error(data.message || "Failed to assign schedule");
    }

    return data.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

export async function addProjectWorker(projectId: string, payload: { userId: string; managerId: string }) {
  try {
    const { data } = await api.post<{
      success: boolean;
      message: string;
      data: any;
    }>(`/admin/projects/${projectId}/team/workers`, payload);

    if (!data.success) {
      throw new Error(data.message || "Failed to add worker");
    }

    return data.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

export async function getAssignedWorkers(projectId: string, managerId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any[];
  }>(`/admin/projects/${projectId}/team/managers/${managerId}/workers`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load assigned workers");
  }

  return data.data.map((worker: any) => ({
    ...worker,
    avatarUrl: resolveMediaUrl(worker.avatarUrl),
  }));
}

export async function removeProjectWorker(projectId: string, userId: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/team/${userId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to remove worker");
  }

  return data.data;
}

export async function getTaskAvailableWorkers(taskId: string, search?: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any[];
    meta: any;
  }>(`/admin/tasks/${taskId}/available-workers`, {
    params: search ? { search } : undefined,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to load available workers");
  }

  return {
    data: data.data.map((worker: any) => ({
      ...worker,
      avatarUrl: resolveMediaUrl(worker.avatarUrl),
    })),
    meta: data.meta,
  };
}

export async function assignTaskWorker(
  taskId: string,
  payload: { workerIds: string[] },
) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${taskId}/assign`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to assign worker");
  }

  return data.data;
}

export async function createSubTask(taskId: string, payload: CreateSubTaskPayload) {
  const { data } = await api.post<CreateSubTaskResponse>(
    `/admin/tasks/${taskId}/subtasks`,
    payload,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to create subtask");
  }

  return data.data;
}

export async function updateSubTask(subTaskId: string, payload: Partial<CreateSubTaskPayload>) {
  const { data } = await api.put<{ success: boolean; data: any; message?: string }>(
    `/admin/subtasks/${subTaskId}`,
    payload,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to update subtask");
  }

  return data.data;
}

export async function deleteTask(taskId: string) {
  const { data } = await api.delete<{ success: boolean; data: any; message?: string }>(
    `/admin/tasks/${taskId}`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to delete task");
  }

  return data.data;
}

export async function deleteSubTask(subTaskId: string) {
  const { data } = await api.delete<{ success: boolean; data: any; message?: string }>(
    `/admin/subtasks/${subTaskId}`,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to delete subtask");
  }

  return data.data;
}

export type GeofencePoint = { lat: number; lng: number };
export type CompanyGeofence = {
  id: string;
  projectId: string;
  zoneName: string;
  polygonCoords: GeofencePoint[];
  totalAreaSqft: number | null;
  perimeterFt: number | null;
  isActive: boolean;
};

export async function getProjectGeofences(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: CompanyGeofence[];
  }>(`/admin/projects/${projectId}/geofences`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load geofences");
  }

  return data.data;
}

export async function createProjectGeofence(
  projectId: string,
  payload: {
    zoneName: string;
    polygonCoords: GeofencePoint[];
    totalAreaSqft?: number;
    perimeterFt?: number;
  },
) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: CompanyGeofence;
  }>(`/admin/projects/${projectId}/geofences`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to create geofence");
  }

  return data.data;
}

export async function updateProjectGeofence(
  projectId: string,
  geofenceId: string,
  payload: {
    zoneName?: string;
    polygonCoords?: GeofencePoint[];
    totalAreaSqft?: number;
    perimeterFt?: number;
    isActive?: boolean;
  },
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: CompanyGeofence;
  }>(`/admin/projects/${projectId}/geofences/${geofenceId}`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to update geofence");
  }

  return data.data;
}

export async function deleteProjectGeofence(projectId: string, geofenceId: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
    data: CompanyGeofence;
  }>(`/admin/projects/${projectId}/geofences/${geofenceId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to delete geofence");
  }

  return data.data;
}

export async function getProjectGeofenceLocationLogs(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: Array<{
      id: string;
      worker: { id: string; fullName: string; avatarUrl: string | null; role: string };
      lat: number;
      lng: number;
      eventType: string;
      zoneName: string | null;
      loggedAt: string;
    }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`/admin/projects/${projectId}/geofences/location-logs`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load location logs");
  }

  return data;
}

export async function getProjectGeofenceViolations(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: Array<{
      id: string;
      geofenceName: string;
      distanceM: number;
      description: string;
      isResolved: boolean;
      occurredAt: string;
    }>;
    meta: { total: number; page: number; limit: number; totalPages: number };
  }>(`/admin/projects/${projectId}/geofences/violations`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load violations");
  }

  return data;
}

export async function getProjectGeofenceTimeSummary(projectId: string) {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/projects/${projectId}/geofences/time-summary`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load geofence summary");
  }

  return data.data;
}

import type { TaskDetailsData, TaskDetailsApiResponse } from "../../types/company.types";

type BackendTaskDetailsResponse = {
  project: { id: string; name: string } | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    status: string;
    approvalDecision: string | null;
    approvalNotes: string | null;
    completionDecision: string | null;
    completionNotes: string | null;
    dueDate: string | null;
    estimatedHours?: number | null;
    price?: number;
  };
  floors?: Array<{
    id: string;
    name: string;
    floorNumber?: number;
    units?: Array<{ id: string; name: string }>;
  }>;
  location?: string | null;
  subTaskCount?: number;
  completedSubTaskCount?: number;
  assignedWorkerCount?: number;
  expenses?: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    status: string;
    date: string;
    receiptUrl: string | null;
  }>;
  assignee?: any;
  taskAssignees?: any[];
  subTasks?: any[];
  reports?: any[];
  taskInventories?: any[];
};

export async function getTaskDetails(taskId: string): Promise<TaskDetailsData> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: BackendTaskDetailsResponse;
  }>(`/admin/tasks/${taskId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load task details");
  }

  const taskData = data.data;
  const firstFloor = taskData.floors?.[0];
  const firstUnit = firstFloor?.units?.[0];

  return {
    id: taskData.task.id,
    title: taskData.task.title,
    description: taskData.task.description ?? "",
    priority: taskData.task.priority ?? null,
    status: taskData.task.status,
    dueDate: taskData.task.dueDate ?? null,
    estimatedHours: taskData.task.estimatedHours ?? null,
    price: taskData.task.price ?? 0,
    project: { name: taskData.project?.name ?? "" },
    floor: { name: firstFloor?.name ?? "" },
    room: { name: firstUnit?.name ?? "" },
    floors:
      taskData.floors?.map((floor) => ({
        id: floor.id,
        name: floor.name,
        floorNumber: floor.floorNumber ?? 0,
        units: floor.units ?? [],
      })) ?? [],
    location: taskData.location ?? "",
    subTaskCount: taskData.subTaskCount ?? 0,
    completedSubTaskCount: taskData.completedSubTaskCount ?? 0,
    assignedWorkerCount: taskData.assignedWorkerCount ?? 0,
    assignee: taskData.assignee ?? null,
    taskAssignees: taskData.taskAssignees ?? [],
    subTasks: taskData.subTasks ?? [],
    reports: taskData.reports ?? [],
    taskInventories: taskData.taskInventories ?? [],
    expenses: taskData.expenses ?? [],
  };
}

type AdminSubTaskDetailResponse = {
  id: string;
  title: string;
  description: string;
  priority: string | null;
  status: string;
  approvalDecision: string | null;
  approvalNotes: string | null;
  dueDate: string | null;
  estimatedHours: number | null;
  price?: number;
  task?: {
    id: string;
    title: string;
    description?: string | null;
    priority?: string | null;
    dueDate?: string | null;
    status?: string;
    approvalDecision?: string | null;
    completionDecision?: string | null;
  } | null;
  project?: { id: string; name: string; location?: string | null } | null;
  assignment?: {
    id: string;
    worker?: { id: string; fullName: string; avatarUrl?: string | null; role?: string | null } | null;
    unit?: { id: string; name: string } | null;
    assignedAt?: string | null;
  } | null;
  photos?: {
    beforePhotoUrl?: string | null;
    afterPhotoUrl?: string | null;
    receiptUrl?: string | null;
  } | null;
  reportSummary?: string | null;
  report?: {
    id: string;
    notes?: string | null;
    reviewDecision?: string | null;
    reviewDescription?: string | null;
    reviewAttachmentUrl?: string | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    submittedAt?: string | null;
  } | null;
  inventoryUsed?: Array<{
    id: string;
    qtyUsed: number;
    inventory?: { id: string; name: string; unit?: string | null; category?: string | null } | null;
  }>;
  expenses?: Array<{
    id: string;
    description: string;
    category: string;
    amount: number;
    status: string;
    date: string;
    receiptUrl: string | null;
  }>;
  units?: Array<{ id: string; name: string }>;
  taskAssignee?: {
    id: string;
    user?: { id: string; fullName: string; avatarUrl?: string | null; role?: string | null } | null;
    unit?: { id: string; name: string } | null;
    assignedAt?: string | null;
  } | null;
};

export async function getAdminSubTaskDetails(subTaskId: string): Promise<TaskDetailsData> {
  const { data } = await api.get<{
    success: boolean;
    message: string;
    data: AdminSubTaskDetailResponse;
  }>(`/admin/subtasks/${subTaskId}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to load subtask details");
  }

  const subTask = data.data;
  const firstUnit = subTask.units?.[0] ?? subTask.assignment?.unit ?? subTask.taskAssignee?.unit ?? null;

  return {
    id: subTask.id,
    title: subTask.title,
    description: subTask.description ?? "",
    priority: subTask.priority ?? null,
    status: subTask.status,
    dueDate: subTask.dueDate ?? null,
    estimatedHours: subTask.estimatedHours ?? null,
    price: subTask.price ?? 0,
    project: { name: subTask.project?.name ?? subTask.task?.title ?? "" },
    floor: { name: "" },
    room: { name: firstUnit?.name ?? "" },
    floors: [],
    location: [subTask.project?.location, firstUnit?.name].filter(Boolean).join(" • "),
    subTaskCount: 0,
    completedSubTaskCount: 0,
    assignedWorkerCount: subTask.assignment?.worker ? 1 : 0,
    assignee: subTask.assignment?.worker ? { fullName: subTask.assignment.worker.fullName } : null,
    taskAssignees: subTask.taskAssignee
      ? [
        {
          id: subTask.taskAssignee.id,
          user: subTask.taskAssignee.user,
          unit: subTask.taskAssignee.unit,
          assignedAt: subTask.taskAssignee.assignedAt,
        },
      ]
      : [],
    subTasks: [],
    reports: subTask.report
      ? [
        {
          id: subTask.report.id,
          notes: subTask.report.notes ?? subTask.reportSummary ?? "",
          beforePhotoUrl: subTask.photos?.beforePhotoUrl ?? null,
          afterPhotoUrl: subTask.photos?.afterPhotoUrl ?? null,
          receiptUrl: subTask.photos?.receiptUrl ?? null,
          reviewDecision: subTask.report.reviewDecision ?? "",
          worker: {
            id: subTask.assignment?.worker?.id ?? "",
            fullName: subTask.assignment?.worker?.fullName ?? "",
            avatarUrl: subTask.assignment?.worker?.avatarUrl ?? null,
          },
        },
      ]
      : [],
    taskInventories: (subTask.inventoryUsed ?? [])
      .filter((item) => item.inventory)
      .map((item) => ({
        id: item.id,
        qtyUsed: item.qtyUsed,
        inventory: {
          id: item.inventory!.id,
          name: item.inventory!.name,
          unit: item.inventory!.unit ?? "",
        },
      })),
    expenses: subTask.expenses ?? [],
  };
}


export async function reviewTaskReport(taskId: string, reportId: string, reviewDecision: string) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: any;
  }>(`/admin/tasks/${taskId}/reports/${reportId}/review`, { reviewDecision });

  if (!data.success) {
    throw new Error(data.message || "Failed to submit review");
  }

  return data.data;
}

export type UpdateAdminTaskPayload = {
  title?: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  estimatedHours?: number;
  price?: number;
  actualHours?: number;
  expenseDescription?: string;
  expenseAmount?: number;
  allowSubTaskCreation?: boolean;
  floors?: {
    floorId: string;
    unitIds?: string[];
  }[];
};

export async function updateTask(
  taskId: string,
  payload: UpdateAdminTaskPayload,
  file?: { uri: string; name?: string | null; type?: string | null } | null,
) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  });

  if (file?.uri && !file.uri.startsWith("http")) {
    formData.append("file", {
      uri: file.uri,
      name: file.name || "task-expense.jpg",
      type: file.type || "image/jpeg",
    } as any);
  }

  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: TaskDetailsData & { expense?: unknown };
  }>(`/admin/tasks/${taskId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to update task");
  }

  return data.data;
}

export async function generateCompanyShareLink(companyId: string) {
  const { data } = await api.post(`/admin/companies/${companyId}/share`);
  return data.data;
}

export async function generateProjectShareLink(projectId: string) {
  const { data } = await api.post(`/admin/projects/${projectId}/share`);
  return data.data;
}
