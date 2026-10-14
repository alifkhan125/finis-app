import { api } from "@/lib/api/client";

export type ManagerQuote = {
  id: string;
  createdById: string;
  projectType: string;
  propertyType: string;
  unitType: string;
  title: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  subtotal: number;
  notes: string | null;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    role: string;
  };
};

export type ManagerQuotesResponse = {
  total: number;
  quotes: ManagerQuote[];
  requestedBy: string;
};

export type UpdateManagerQuotePayload = {
  title?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  notes?: string;
  isCustom?: boolean;
  projectType?: string;
  propertyType?: string;
  unitType?: string;
};

export type CreateManagerQuotePayload = {
  projectType: string;
  propertyType: string;
  unitType: string;
  title: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  notes?: string;
  isCustom?: boolean;
};

export type UploadedQuotePdfResponse = {
  url: string;
  originalName: string;
  mimeType: string;
};

export type SendManagerQuoteMailPayload = {
  clientEmail: string;
  clientName?: string;
  subject: string;
  body: string;
  attachments?: {
    name: string;
    url: string;
    size?: string;
  }[];
};

export type QuoteSelectorOption = {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  unit?: string;
  isActive?: boolean;
};

export type QuoteSelectorsResponse = {
  projectTypes?: QuoteSelectorOption[];
  propertyTypes?: QuoteSelectorOption[];
  unitTypes?: QuoteSelectorOption[];
  categories?: QuoteSelectorOption[];
  measurementTypes?: QuoteSelectorOption[];
  workItems?: QuoteSelectorOption[];
};

export type QuoteWorkItemLookup = {
  id: string;
  categoryId?: string;
  projectType?: string;
  propertyType?: string;
  unitType?: string;
  name: string;
  unitCost?: number | null;
  category?: { id: string; name: string } | null;
  measurementType?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type QuoteWorkItemGroup = {
  category: {
    id: string;
    name: string;
    isActive?: boolean;
    sortOrder?: number | null;
  };
  data: QuoteWorkItemLookup[];
};

export type QuickAddQuoteWorkItemPayload = {
  categoryId: string;
  projectType: string;
  propertyType: string;
  unitType: string;
  name: string;
  measurementType: string;
  quantity?: number;
  unitCost?: number;
  notes?: string;
};

export async function getManagerQuotes(params?: {
  projectType?: string;
  propertyType?: string;
  unitType?: string;
}) {
  const normalizedParams = {
    projectType: params?.projectType?.toLowerCase(),
    propertyType: params?.propertyType?.toLowerCase(),
    unitType: params?.unitType?.toLowerCase(),
  };

  const { data } = await api.get<{ success: boolean; message: string; data: ManagerQuotesResponse }>(
    "/manager/quotes",
    { params: normalizedParams },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load quotes");
  }

  return data.data;
}

export async function getQuoteSelectors() {
  const { data } = await api.get<{ success: boolean; message: string; data: QuoteSelectorsResponse }>(
    "/manager/quotes/selectors",
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load quote selectors");
  }

  return data.data;
}

export async function getQuoteWorkCategories(search?: string) {
  const { data } = await api.get<{ success: boolean; message: string; data: QuoteSelectorOption[] }>(
    "/manager/quotes/work-categories",
    { params: search ? { search } : undefined },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load work categories");
  }

  return data.data;
}

export async function getQuoteMeasurementTypes(search?: string) {
  const { data } = await api.get<{ success: boolean; message: string; data: QuoteSelectorOption[] }>(
    "/manager/quotes/measurement-types",
    { params: search ? { search } : undefined },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load measurement types");
  }

  return data.data;
}

export async function getQuoteWorkItems(params: {
  projectType?: string;
  propertyType?: string;
  unitType?: string;
  search?: string;
}) {
  const { data } = await api.get<{ success: boolean; message: string; total?: number; data: QuoteWorkItemGroup[] }>(
    "/manager/quotes/work-items",
    { params },
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to load work items");
  }

  return data.data;
}

export async function quickAddQuoteWorkItem(payload: QuickAddQuoteWorkItemPayload) {
  const { data } = await api.post<{ success: boolean; message: string; data: { workItem: any; quote: ManagerQuote } }>(
    "/manager/quotes/work-items/quick-add",
    payload,
  );

  if (!data.success) {
    throw new Error(data.message || "Failed to add work item");
  }

  return data.data;
}

export async function updateManagerQuote(
  id: string,
  payload: UpdateManagerQuotePayload,
) {
  const { data } = await api.put<{
    success: boolean;
    message: string;
    data: ManagerQuote;
  }>(`/manager/quotes/${id}`, payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to update quote");
  }

  return data.data;
}

export async function createManagerQuote(payload: CreateManagerQuotePayload) {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    data: ManagerQuote;
  }>("/manager/quotes", payload);

  if (!data.success) {
    throw new Error(data.message || "Failed to create quote");
  }

  return data.data;
}

export async function deleteManagerQuote(id: string) {
  const { data } = await api.delete<{
    success: boolean;
    message: string;
  }>(`/manager/quotes/${id}`);

  if (!data.success) {
    throw new Error(data.message || "Failed to delete quote");
  }

  return data;
}

export async function sendManagerQuoteMail(
  payload: SendManagerQuoteMailPayload,
  file?: {
    uri: string;
    name: string;
    type: string;
  },
) {
  const formData = new FormData();
  formData.append("clientEmail", payload.clientEmail);
  formData.append("subject", payload.subject);
  formData.append("body", payload.body);

  if (payload.clientName) {
    formData.append("clientName", payload.clientName);
  }

  if (payload.attachments?.length) {
    formData.append("attachments", JSON.stringify(payload.attachments));
  }

  if (file) {
    formData.append("file", file as any);
  }

  const { data } = await api.post<{
    success?: boolean;
    message?: string;
    data?: unknown;
  }>("/mail/send", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (data.success === false) {
    throw new Error(data.message || "Failed to send quote");
  }

  return data;
}

export type CreateQuoteEstimateTaskPayload = {
  title: string;
  description?: string;
  floorNumber?: number;
  unitName?: string;
  quantity?: number;
  unit?: string;
  estimatedHours?: number;
  unitPrice?: number;
  sortOrder?: number;
};

export type CreateQuoteEstimatePayload = {
  companyId: string;
  projectName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectAddress?: string;
  projectType?: string;
  propertyType?: string;
  unitType?: string;
  startDate?: string;
  endDate?: string;
  floorsCount?: number;
  unitsPerFloor?: number;
  discountAmount?: number;
  taxAmount?: number;
  tasks?: CreateQuoteEstimateTaskPayload[];
};

export type QuoteEstimateResponse = {
  id: string;
  quoteNumber: string;
  companyId: string;
  projectName: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  projectAddress?: string | null;
  projectType?: string | null;
  propertyType?: string | null;
  unitType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  floorsCount?: number | null;
  unitsPerFloor?: number | null;
  totalUnits?: number | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "converted" | "cancelled" | string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  company?: { id: string; name: string };
  createdAt: string;
  updatedAt?: string;
  tasks?: Array<{
    id: string;
    title: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export async function createQuoteEstimate(payload: CreateQuoteEstimatePayload) {
  const { data } = await api.post<{
    success?: boolean;
    message?: string;
    data?: QuoteEstimateResponse;
    quote?: QuoteEstimateResponse;
  }>("/admin/quote-estimates", payload);

  const quote = data?.data || data?.quote || (data as any);
  return quote as QuoteEstimateResponse;
}

export async function sendQuoteEstimate(id: string) {
  const { data } = await api.post<{
    success?: boolean;
    message?: string;
    data?: QuoteEstimateResponse;
    quote?: QuoteEstimateResponse;
  }>(`/admin/quote-estimates/${id}/send`);

  return data;
}

export async function acceptAndCreateProject(
  id: string,
  payload?: { acceptedByName?: string; notes?: string },
) {
  const { data } = await api.post<{
    success?: boolean;
    message?: string;
    data?: {
      quote: QuoteEstimateResponse;
      project: { id: string; name: string };
    };
  }>(`/admin/quote-estimates/${id}/accept-and-create-project`, payload || {});

  return data;
}

export async function getQuoteEstimates(params?: {
  companyId?: string;
  status?: string;
  search?: string;
}) {
  const { data } = await api.get<any>("/admin/quote-estimates", { params });

  const raw = data?.data ?? data;
  if (Array.isArray(raw)) return raw as QuoteEstimateResponse[];
  if (raw && Array.isArray(raw.quotes)) return raw.quotes as QuoteEstimateResponse[];
  return [] as QuoteEstimateResponse[];
}


