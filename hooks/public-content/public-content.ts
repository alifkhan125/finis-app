import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner-native";
import {
  createWorkerSupportRequest,
  getPublicContentPage,
  type WorkerSupportRequestPayload,
} from "@/api/public-content/public-content.api";

export function usePublicContentPageQuery(slug: string) {
  return useQuery({
    queryKey: ["public-content", slug],
    queryFn: () => getPublicContentPage(slug),
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });
}

export function useWorkerSupportRequestMutation() {
  return useMutation({
    mutationFn: (payload: WorkerSupportRequestPayload) =>
      createWorkerSupportRequest(payload),
    onSuccess: (data) => {
      toast.success(data.message || "Support request sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send support request");
    },
  });
}
