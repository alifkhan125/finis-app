import { api } from "@/lib/api/client";

export type ReimbursementExpenseStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";
export type ReimbursementExpense = {
  id: string; title: string; expenseDate: string; subtotal: number; tax: number; totalAmount: number; amount?: number; currency: string; category: string;
  vendor?: string | null; paymentMethod?: string | null; projectId?: string | null; taskId?: string | null; subTaskId?: string | null; notes?: string | null; receiptUrl?: string | null;
  status: ReimbursementExpenseStatus; submittedAt?: string | null; approvedAt?: string | null; rejectedAt?: string | null; paidAt?: string | null; rejectionNote?: string | null;
  createdAt: string; updatedAt: string; project?: { id: string; name: string } | null; task?: { id: string; title: string } | null; subTask?: { id: string; title: string } | null;
};
export type ExpensePayload = { title: string; expenseDate: string; subtotal: number; tax: number; totalAmount: number; currency?: string; category: string; vendor?: string; paymentMethod: string; projectId?: string; taskId?: string; subTaskId?: string; notes?: string; action?: "DRAFT" | "SUBMITTED" };
export type ExpenseFilters = { page?: number; limit?: number; search?: string; status?: string; category?: string; currency?: string; projectId?: string; sortBy?: "createdAt" | "expenseDate" | "amount" | "totalAmount" | "subtotal"; sortOrder?: "asc" | "desc" };
export type ExpenseSummary = { totalExpenses: number; draft: number; submitted: number; approved: number; rejected: number; paid: number; totalAmountThisMonth: number };
export type ExpenseOptions = { currency: string[]; category: string[]; paymentMethod: string[] };
export type ExpenseProjectOption = { id: string; name: string };
export type ExpenseTaskOption = { id: string; taskId: string; subTaskId?: string | null; type: "task" | "subtask"; title: string; status?: string };

type ListResponse = { success: boolean; message: string; data: ReimbursementExpense[]; meta: { page: number; limit: number; total: number; totalPages: number } };
type DataResponse<T> = { success: boolean; message: string; data: T };
type SummaryResponse = { success: boolean; message: string; summary: ExpenseSummary };
type OptionsResponse = { success: boolean; message: string; data?: ExpenseOptions; currency?: string[]; category?: string[]; paymentMethod?: string[] };
type ProjectsResponse = { success: boolean; message: string; data: ExpenseProjectOption[] };
type TaskOptionsResponse = { success: boolean; message: string; data: ExpenseTaskOption[] };

export async function getAdminExpenses(params?: ExpenseFilters) { const { data } = await api.get<ListResponse>("/admin/reimbursement-expenses", { params }); if (!data.success) throw new Error(data.message); return { data: data.data ?? [], meta: data.meta }; }
export async function getAdminExpenseSummary() { const { data } = await api.get<SummaryResponse>("/admin/reimbursement-expenses/summary"); if (!data.success) throw new Error(data.message); return data.summary; }
export async function getAdminExpenseOptions() { const { data } = await api.get<OptionsResponse>("/admin/reimbursement-expenses/options"); if (!data.success) throw new Error(data.message); return data.data ?? { currency: data.currency ?? [], category: data.category ?? [], paymentMethod: data.paymentMethod ?? [] }; }
export async function getAdminExpenseProjects() { const { data } = await api.get<ProjectsResponse>("/admin/reimbursement-expenses/projects"); if (!data.success) throw new Error(data.message); return data.data ?? []; }
export async function getAdminExpenseProjectTasks(projectId: string) { const { data } = await api.get<TaskOptionsResponse>(`/admin/reimbursement-expenses/projects/${projectId}/tasks`); if (!data.success) throw new Error(data.message); return data.data ?? []; }
export async function getAdminExpense(id: string) { const { data } = await api.get<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}`); if (!data.success) throw new Error(data.message); return data.data; }
function multipartConfig(payload: unknown) { return payload instanceof FormData ? { headers: { "Content-Type": undefined } } : undefined; }
export async function createAdminExpense(payload: ExpensePayload | FormData) { const { data } = await api.post<DataResponse<ReimbursementExpense>>("/admin/reimbursement-expenses", payload, multipartConfig(payload)); if (!data.success) throw new Error(data.message); return data.data; }
export async function updateAdminExpense(id: string, payload: Partial<ExpensePayload> | FormData) { const { data } = await api.patch<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}`, payload, multipartConfig(payload)); if (!data.success) throw new Error(data.message); return data.data; }
export async function deleteAdminExpense(id: string) { const { data } = await api.delete<DataResponse<{ id: string }>>(`/admin/reimbursement-expenses/${id}`); if (!data.success) throw new Error(data.message); return data.data; }
export async function submitAdminExpense(id: string) { const { data } = await api.post<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}/submit`); if (!data.success) throw new Error(data.message); return data.data; }
export async function approveAdminExpense(id: string) { const { data } = await api.post<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}/approve`); if (!data.success) throw new Error(data.message); return data.data; }
export async function rejectAdminExpense(id: string, comment?: string) { const { data } = await api.post<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}/reject`, { comment }); if (!data.success) throw new Error(data.message); return data.data; }
export async function requestRevisionAdminExpense(id: string, comment?: string) { const { data } = await api.post<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}/request-revision`, { comment }); if (!data.success) throw new Error(data.message); return data.data; }
export async function markAdminExpensePaid(id: string) { const { data } = await api.post<DataResponse<ReimbursementExpense>>(`/admin/reimbursement-expenses/${id}/mark-paid`); if (!data.success) throw new Error(data.message); return data.data; }
