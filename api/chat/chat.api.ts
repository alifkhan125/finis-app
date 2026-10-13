import { api } from "@/lib/api/client";
import type { ApiResponse } from "@/types/auth.types";

export type ChatThreadType = "direct" | "group" | "project" | "support";

export type ChatParticipant = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role?: string | null;
  status?: string | null;
  isOnline?: boolean;
  lastActiveAt?: string | null;
};

export type ChatThreadLastMessage = {
  content: string | null;
  sentAt: string;
  senderId: string;
  isRead: boolean;
};

export type ChatThread = {
  id: string;
  type: ChatThreadType;
  name: string;
  projectId: string | null;
  isActive: boolean;
  lastMessage: ChatThreadLastMessage | null;
  unreadCount: number;
  participants: ChatParticipant[];
  isBlocked?: boolean;
  blockedByMe?: boolean;
  blockedByOther?: boolean;
};

export type ChatThreadListResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: ChatThread[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ChatContact = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
};

export type BlockedChatUser = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: string | null;
  status: string | null;
};

export type ChatMessageSender =
  | {
      id: string;
      fullName: string;
      avatarUrl: string | null;
      role: string;
    }
  | {
      user: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        role: string;
      };
    };

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "location" | null;
  isRead: boolean;
  sentAt: string;
  sender: ChatMessageSender;
};

export type ChatMessageListResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: ChatMessage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type SendChatMessagePayload = {
  threadId: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: "image" | "location";
  locationUrl?: string;
};

export type UploadChatFileResult = {
  url: string;
  originalName: string;
  mimeType: string;
};

type ThreadQueryParams = {
  type?: ChatThreadType;
  search?: string;
  page?: number;
  limit?: number;
};

type MessageQueryParams = {
  page?: number;
  limit?: number;
};

export function resolveChatAvatar(path: string | null | undefined) {
  return path ?? null;
}

export function formatChatPreview(message: ChatThreadLastMessage | null) {
  if (!message) {
    return "No messages yet";
  }

  if (message.content?.trim()) {
    return message.content.trim();
  }

  return "Attachment";
}

export function formatChatTime(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function getChatThreads(params: ThreadQueryParams = {}) {
  const { data } = await api.get<ChatThreadListResponse>("/messages/threads/chat", {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      ...(params.type ? { type: params.type } : {}),
      ...(params.search ? { search: params.search } : {}),
    },
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to load chats");
  }

  return data;
}

export async function getSupportThread() {
  const { data } = await api.get<{
    success: boolean;
    statusCode: number;
    message: string;
    data: ChatThread | null;
  }>("/messages/threads/support");

  if (!data.success) {
    throw new Error(data.message || "Failed to load support thread");
  }

  return data.data;
}

export async function getOrCreateSupportThread() {
  const { data } = await api.post<{
    success: boolean;
    statusCode: number;
    message: string;
    data: ChatThread;
  }>("/messages/support/thread");

  if (!data.success) {
    throw new Error(data.message || "Failed to open support thread");
  }

  return data.data;
}

export async function getChatContacts(search?: string) {
  const { data } = await api.get<{
    success: boolean;
    statusCode: number;
    message: string;
    data: ChatContact[];
  }>("/messages/contacts", {
    params: search ? { search } : undefined,
  });

  if (!data.success) {
    throw new Error(data.message || "Failed to load contacts");
  }

  return data.data.map((contact) => ({
    ...contact,
    avatarUrl: contact.avatarUrl,
  }));
}

export async function getChatMessages(
  threadId: string,
  params: MessageQueryParams = {},
) {
  const { data } = await api.get<ChatMessageListResponse>(
    `/messages/threads/${threadId}/messages`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load messages");
  }

  return data;
}

export async function createDirectThread(targetUserId: string) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: ChatThread;
  }>("/messages/threads/direct", { targetUserId });

  if (!data.success) {
    throw new Error(data.message || "Failed to open chat");
  }

  return data.data;
}

export async function sendChatMessage(payload: SendChatMessagePayload) {
  const { data } = await api.post<
    ApiResponse<ChatMessage> | ChatMessage | { data: ChatMessage }
  >(
    "/messages/send",
    payload,
  );

  if (data && typeof data === "object" && "success" in data) {
    if (!data.success) {
      throw new Error(data.message || "Failed to send message");
    }

    const normalized = "data" in data ? data.data : (data as ApiResponse<ChatMessage>).data;
    return normalized;
  }

  if (data && typeof data === "object" && "id" in data) {
    return data as ChatMessage;
  }

  if (data && typeof data === "object" && "data" in data && data.data) {
    return data.data as ChatMessage;
  }

  throw new Error("Failed to send message");
}

export async function uploadChatFile(file: {
  uri: string;
  name: string;
  type: string;
}) {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const { data } = await api.post<
    { data?: UploadChatFileResult; message?: string }
  >("/messages/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!data?.data?.url) {
    throw new Error(data?.message || "Failed to upload file");
  }

  return data.data;
}

export async function getBlockedChatUsers() {
  const { data } = await api.get<{
    success: boolean;
    statusCode: number;
    message: string;
    data: BlockedChatUser[];
  }>("/messages/blocked");

  if (!data.success) {
    throw new Error(data.message || "Failed to load blocked users");
  }

  return data.data;
}

export async function blockChatUser(targetUserId: string) {
  const { data } = await api.post<{
    success: boolean;
    statusCode: number;
    message: string;
    data?: unknown;
  }>("/messages/block", { targetUserId });

  if (!data.success) {
    throw new Error(data.message || "Failed to block user");
  }

  return data.message;
}

export async function unblockChatUser(targetUserId: string) {
  const { data } = await api.post<{
    success: boolean;
    statusCode: number;
    message: string;
    data?: unknown;
  }>("/messages/unblock", { targetUserId });

  if (!data.success) {
    throw new Error(data.message || "Failed to unblock user");
  }

  return data.message;
}
