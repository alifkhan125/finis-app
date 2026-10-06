import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner-native";
import { approveAdminExpense, createAdminExpense, deleteAdminExpense, ExpenseFilters, ExpensePayload, getAdminExpenses, getAdminExpenseOptions, getAdminExpenseProjectTasks, getAdminExpenseProjects, getAdminExpenseSummary, markAdminExpensePaid, rejectAdminExpense, requestRevisionAdminExpense, submitAdminExpense, updateAdminExpense } from "@/api/admin/expenses.api";
import { useAuthStore } from "@/store/auth.store";

const key = ["admin", "expenses"];
export function useAdminExpensesQuery(filters?: ExpenseFilters) { const token = useAuthStore((s) => s.token); return useQuery({ queryKey: [...key, filters, token], queryFn: () => getAdminExpenses(filters), enabled: !!token, staleTime: 30000 }); }
export function useAdminExpenseSummaryQuery() { const token = useAuthStore((s) => s.token); return useQuery({ queryKey: [...key, "summary", token], queryFn: getAdminExpenseSummary, enabled: !!token, staleTime: 30000 }); }
export function useAdminExpenseOptionsQuery() { const token = useAuthStore((s) => s.token); return useQuery({ queryKey: [...key, "options", token], queryFn: getAdminExpenseOptions, enabled: !!token, staleTime: 30000 }); }
export function useAdminExpenseProjectsQuery() { const token = useAuthStore((s) => s.token); return useQuery({ queryKey: [...key, "projects", token], queryFn: getAdminExpenseProjects, enabled: !!token, staleTime: 30000 }); }
export function useAdminExpenseProjectTasksQuery(projectId?: string) { const token = useAuthStore((s) => s.token); return useQuery({ queryKey: [...key, "project-tasks", projectId, token], queryFn: () => getAdminExpenseProjectTasks(projectId!), enabled: !!token && !!projectId, staleTime: 30000 }); }
function useExpenseMutation<T>(fn: (payload: T) => Promise<unknown>, message: string) { const qc = useQueryClient(); return useMutation({ mutationFn: fn, onSuccess: async () => { await qc.invalidateQueries({ queryKey: key }); toast.success(message); }, onError: (e) => toast.error(e instanceof Error ? e.message : "Expense action failed") }); }
export function useCreateAdminExpenseMutation() { return useExpenseMutation((payload: ExpensePayload | FormData) => createAdminExpense(payload), "Expense saved"); }
export function useUpdateAdminExpenseMutation() { return useExpenseMutation(({ id, payload }: { id: string; payload: Partial<ExpensePayload> | FormData }) => updateAdminExpense(id, payload), "Expense updated"); }
export function useDeleteAdminExpenseMutation() { return useExpenseMutation((id: string) => deleteAdminExpense(id), "Expense deleted"); }
export function useSubmitAdminExpenseMutation() { return useExpenseMutation((id: string) => submitAdminExpense(id), "Expense submitted"); }
export function useApproveAdminExpenseMutation() { return useExpenseMutation((id: string) => approveAdminExpense(id), "Expense approved"); }
export function useRejectAdminExpenseMutation() { return useExpenseMutation(({ id, comment }: { id: string; comment?: string }) => rejectAdminExpense(id, comment), "Expense rejected"); }
export function useRequestRevisionAdminExpenseMutation() { return useExpenseMutation(({ id, comment }: { id: string; comment?: string }) => requestRevisionAdminExpense(id, comment), "Revision requested"); }
export function useMarkAdminExpensePaidMutation() { return useExpenseMutation((id: string) => markAdminExpensePaid(id), "Expense marked paid"); }
