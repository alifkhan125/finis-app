import * as FileSystem from "expo-file-system/legacy";
import { api } from "@/lib/api/client";
import { API_BASE_URL } from "@/lib/config";
import { getCurrentAccessToken } from "@/lib/auth-token";

export type AdminReportType =
  | "payroll"
  | "project_invoices"
  | "worker_performance"
  | "expense";

export type AdminReportFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type AdminGenerateReportParams = {
  type: AdminReportType;
  frequency: AdminReportFrequency;
  startDate: string;
  endDate: string;
  projectId?: string;
};

export type AdminPayrollReport = {
  type: "payroll";
  frequency: AdminReportFrequency;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    totalWorkers: number;
    totalHours: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerCost: number;
    byStatus: Record<string, number>;
  };
  workers: {
    worker: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      department: string | null;
      hourlyRate: number | null;
    };
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalHours: number;
    payrolls: {
      payrollId: string;
      period: string;
      grossPay: number;
      deductions: number;
      netPay: number;
      status: string;
    }[];
  }[];
};

export type AdminProjectInvoicesReport = {
  type: "project_invoices";
  frequency: AdminReportFrequency;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    totalProjects: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalBillableSubTasks?: number;
    totalInvoiceAmount?: number;
    byStatus: Record<string, number>;
  };
  projects: {
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
      logoUrl: string | null;
    };
    status: string;
    progress: number;
    startDate: string;
    endDate: string;
    budget: number | null;
    spent: number | null;
    remaining: number | null;
    approvedExpenses: number;
    billableSubTaskCount?: number;
    invoiceTotal?: number;
    invoiceLines?: {
      subTaskId: string;
      taskId: string;
      taskTitle: string;
      title: string;
      quantity: number;
      unitValue: number;
      lineTotal: number;
      completedAt?: string | null;
      unit?: { id: string; name: string; floor?: { id: string; name: string } | null } | null;
      worker?: { id: string; fullName: string } | null;
    }[];
    taskCompletion: number;
    counts: {
      teamMembers: number;
      tasks: number;
      floors: number;
    };
  }[];
};

export type AdminWorkerPerformanceReport = {
  type: "worker_performance";
  frequency: AdminReportFrequency;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    totalWorkers: number;
    avgAttendanceRate: string;
    avgTaskCompletion: string;
    topPerformer: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      department: string | null;
    } | null;
  };
  workers: {
    worker: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      department: string | null;
    };
    attendance: {
      totalDays: number;
      presentDays: number;
      attendanceRate: string;
      totalHours: number;
    };
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      completionRate: string;
    };
    reports: {
      total: number;
      approved: number;
      approvalRate: string;
    };
    performanceScore: string;
  }[];
};

export type AdminExpenseReport = {
  type: "expense";
  frequency: AdminReportFrequency;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    total: number;
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    byCategory: Record<string, number>;
  };
  expenses: {
    id: string;
    worker: {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      department: string | null;
    };
    description: string | null;
    category: string;
    amount: number;
    project: {
      id: string;
      name: string;
    } | null;
      date: string;
      status: string;
      receiptUrl: string | null;
  }[];
};

export type AdminGeneratedReport =
  | AdminPayrollReport
  | AdminProjectInvoicesReport
  | AdminWorkerPerformanceReport
  | AdminExpenseReport;

export async function getAdminGeneratedReport(
  params: AdminGenerateReportParams,
) {
  const { data } = await api.get<
    AdminGeneratedReport & { success: boolean; message: string }
  >("/admin/reports/generate", {
    params,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to generate report");
  }

  return data as AdminGeneratedReport;
}

export type AdminExportReportsParams = {
  frequency?: AdminReportFrequency;
  startDate?: string;
  endDate?: string;
  type?: AdminReportType;
  projectId?: string;
};

export type AdminExportedReport = {
  uri: string;
  name: string;
  mimeType: string;
};

/**
 * Calls GET /admin/reports/export, streams the returned PDF to a local file
 * and resolves with the on-device file uri so it can be previewed / shared.
 */
export async function downloadAdminReportsExport(
  params?: AdminExportReportsParams,
): Promise<AdminExportedReport> {
  const query = new URLSearchParams();
  if (params?.frequency) query.append("frequency", params.frequency);
  if (params?.startDate) query.append("startDate", params.startDate);
  if (params?.endDate) query.append("endDate", params.endDate);
  if (params?.type) query.append("type", params.type);
  if (params?.projectId) query.append("projectId", params.projectId);

  const queryString = query.toString();
  const url = `${API_BASE_URL}/admin/reports/export${
    queryString ? `?${queryString}` : ""
  }`;

  const token = getCurrentAccessToken();
  const name = `finis-reports-${Date.now()}.pdf`;
  const fileUri = `${FileSystem.cacheDirectory ?? ""}${name}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Accept: "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error("Failed to export reports");
  }

  return { uri: result.uri, name, mimeType: "application/pdf" };
}
