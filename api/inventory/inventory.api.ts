import { api } from "@/lib/api/client";
import { ApiResponse } from "@/types/auth.types";

export type InventoryApiResponseItem = {
  id: string;
  name: string;
  category: string;
  currentQty: number;
  unit: string;
  minStockQty: number;
  stockStatus: string;
  location: string | null;
  unresolvedDamages: number;
  project: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
};

type GetAllInventoryResponse = ApiResponse<InventoryApiResponseItem[]> & {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function getAllInventoryItems() {
  const { data } = await api.get<GetAllInventoryResponse>("/inventory/all");
  
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch inventory items");
  }
  
  return data;
}



export type InventorySummaryData = {
  totalProducts: number;
  lowStockAlerts: number;
  unresolvedDamages: number;
};

type GetInventorySummaryResponse = ApiResponse<InventorySummaryData>;

export async function getInventorySummary() {
  const { data } = await api.get<GetInventorySummaryResponse>("/inventory/summary");
  
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch inventory summary");
  }
  
  return data.data;
}


export type CreateInventoryPayload = {
  projectId?: string;
  name: string;
  category?: string;
  unit?: string;
  currentQty?: number;
  minStockQty?: number;
  location?: string;
};

export async function createInventoryItem(payload: CreateInventoryPayload) {
  const { data } = await api.post<ApiResponse<any>>("/inventory", payload);
  
  if (!data.success) {
    throw new Error(data.message || "Failed to create inventory item");
  }
  
  return data.data;
}


export type InventoryProject = {
  id: string;
  name: string;
  location: string | null;
};

export type InventoryCreateOptions = {
  projects: InventoryProject[];
  category: string[];
  unit: string[];
};

type GetInventoryProjectsResponse = ApiResponse<InventoryCreateOptions>;

export async function getInventoryProjects() {
  const { data } = await api.get<GetInventoryProjectsResponse>("/inventory/projects");
  
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch inventory projects");
  }
  
  return {
    projects: data.data?.projects ?? [],
    category: data.data?.category ?? [],
    unit: data.data?.unit ?? [],
  };
}


export type LowStockItemResponse = {
  id: string;
  name: string;
  category: string;
  unit: string;
  location: string | null;
  currentQty: number;
  minStockQty: number;
  shortage: number;
  stockStatus: string;
  project: {
    id: string;
    name: string;
  } | null;
  updatedAt: string;
};

type GetLowStockAlertsResponse = ApiResponse<LowStockItemResponse[]>;

export async function getLowStockAlerts() {
  const { data } = await api.get<GetLowStockAlertsResponse>("/inventory/low-stock");
  
  if (!data.success) {
    throw new Error(data.message || "Failed to fetch low stock alerts");
  }
  
  return data.data;
}


export type UpdateInventoryPayload = {
  projectId: string;
  itemId: string;
  name?: string;
  category?: string;
  unit?: string;
  currentQty?: number;
  minStockQty?: number;
  location?: string;
};

export async function updateInventoryItemData({ projectId, itemId, ...data }: UpdateInventoryPayload) {
  const response = await api.patch<ApiResponse<any>>(`/inventory/${projectId}/item/${itemId}`, data);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to update item");
  }
  return response.data.data;
}

export async function deleteInventoryItem(projectId: string, itemId: string) {
  const response = await api.delete<ApiResponse<any>>(`/inventory/${projectId}/item/${itemId}`);
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to delete item");
  }
  return response.data.data;
}

