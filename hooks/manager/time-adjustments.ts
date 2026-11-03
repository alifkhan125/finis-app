import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export function usePendingTimeAdjustmentsQuery() {
  return useQuery({
    queryKey: ["time-adjustments", "pending"],
    queryFn: async () => {
      const { data } = await api.get("/time-adjustments/pending");
      return data.data || data;
    },
  });
}

export function useUpdateTimeAdjustmentStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "denied" }) => {
      const { data } = await api.patch(`/time-adjustments/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-adjustments", "pending"] });
    },
  });
}

export function useSubmitTimeAdjustmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; requestType?: "check_in" | "check_out"; originalTime?: string; adjustedTime?: string; reason?: string; kind?: 'correction' | 'shift_change'; scope?: 'single_day' | 'regular'; scheduleId?: string; sessionId?: string; startTime?: string; endTime?: string }) => {
      const { data } = await api.post("/time-adjustments/request", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["worker", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["worker", "attendance", "history"] });
    },
  });
}
