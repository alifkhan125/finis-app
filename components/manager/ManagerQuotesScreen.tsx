import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createManagerQuote,
  deleteManagerQuote,
  getManagerQuotes,
  getQuoteSelectors,
  getQuoteWorkCategories,
  getQuoteWorkItems,
  quickAddQuoteWorkItem,
  updateManagerQuote,
  createQuoteEstimate,
  updateQuoteEstimate,
  getQuoteEstimate,
  sendQuoteEstimate,
  downloadQuoteEstimatePdf,
  acceptAndCreateProject,
  getQuoteEstimates,
  deleteQuoteEstimate,
  rejectQuoteEstimate,
  cancelQuoteEstimate,
  type QuoteEstimateResponse,
  type QuoteSelectorOption,
  type QuoteWorkItemGroup,
  type QuoteWorkItemLookup,
} from "@/api/manager/quotes.api";
import { setCurrentPreviewDocument } from "@/components/company/taskdetails/documentPreviewStore";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { useCompaniesQuery } from "@/hooks/company/company";
import { toast } from "sonner-native";
import { Ionicons } from "@expo/vector-icons";
import AddCustomQuoteItemModal from "./quotes/AddCustomQuoteItemModal";
import EditQuoteItemModal from "./quotes/EditQuoteItemModal";
import ApplyDiscountModal from "./quotes/ApplyDiscountModal";
import QuoteBuilderForm from "./quotes/QuoteBuilderForm";
import QuoteFinalReviewStep from "./quotes/QuoteFinalReviewStep";
import QuoteCategoriesTab from "./quotes/QuoteCategoriesTab";
import QuoteMeasurementsTab from "./quotes/QuoteMeasurementsTab";
import QuoteWorkItemsTab from "./quotes/QuoteWorkItemsTab";
import QuoteOverviewTab from "./quotes/QuoteOverviewTab";
import {
  formatCurrency,
  type QuoteProjectType,
  type QuotePropertyType,
  type QuoteUnitType,
} from "./quotes/quoteTypes";
import QuoteStepIndicator from "./quotes/QuoteStepIndicator";
import type { QuoteSelectedWorkGroup } from "./quotes/QuoteWorkGroupCard";
import QuoteWorkItemsStep from "./quotes/QuoteWorkItemsStep";
import {
  addCustomQuoteWorkItem,
  calculateQuoteWorkTotals,
  deleteQuoteWorkItem,
  toggleQuoteWorkGroup,
  toggleQuoteWorkItem,
  updateQuoteWorkItemQuantity,
  updateQuoteWorkItemUnit,
  updateQuoteWorkItemDetails,
} from "./quotes/quoteWorkState";

function getValidUntilLabel() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export type QuoteTabId =
  | "builder"
  | "overview"
  | "quotes"
  | "categories"
  | "measurements"
  | "items";

const quotationStepLabels = [
  "Project Details",
  "Quotation Details",
  "Building Details",
  "Workable Area",
  "Services & Pricing",
  "Full Quotation View",
];

export default function ManagerQuotesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<QuoteTabId>("quotes");
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [companyId, setCompanyId] = useState("");
  const [companySheetVisible, setCompanySheetVisible] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [quotationDetailsText, setQuotationDetailsText] = useState("");
  const [quotationDetailsChanged, setQuotationDetailsChanged] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [floorsCount, setFloorsCount] = useState("");
  const [unitsPerFloor, setUnitsPerFloor] = useState("");
  const [floorStart, setFloorStart] = useState("1");
  const [floorEnd, setFloorEnd] = useState("");
  const [unitStart, setUnitStart] = useState("101");
  const [unitEnd, setUnitEnd] = useState("");
  const [projectType, setProjectType] =
    useState<QuoteProjectType>("New Build");
  const [propertyType, setPropertyType] =
    useState<QuotePropertyType>("Residential");
  const [unitType, setUnitType] = useState<QuoteUnitType>("Apartment");
  const [workGroups, setWorkGroups] = useState<QuoteSelectedWorkGroup[]>([]);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isConvertingId, setIsConvertingId] = useState<string | null>(null);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteEstimateResponse | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [discountPercentInput, setDiscountPercentInput] = useState("0");
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [customItemModalVisible, setCustomItemModalVisible] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [customCategoryId, setCustomCategoryId] = useState("");
  const [customMeasurementType, setCustomMeasurementType] = useState("");
  const [customUnitPrice, setCustomUnitPrice] = useState("0");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editGroupId, setEditGroupId] = useState("");
  const [editItemId, setEditItemId] = useState("");

  // Detailed Service Scoping & Floor/Unit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");
  const [editUnit, setEditUnit] = useState("pcs");
  const [editUnitPrice, setEditUnitPrice] = useState("0");
  const [editHours, setEditHours] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSelectedFloors, setEditSelectedFloors] = useState<number[]>([]);
  const [editLocationKeys, setEditLocationKeys] = useState<string[]>([]);
  const [editChecklist, setEditChecklist] = useState<string[]>([]);

  const plannedFloorNumbers = useMemo(() => {
    if (floorsCount) {
      const count = Number(floorsCount);
      return Array.from({ length: Math.max(0, count) }, (_, index) => index + 1);
    }
    return [];
  }, [floorsCount]);

  const getPlannedUnitNames = (floor: number) => {
    const count = Number(unitsPerFloor) || 0;
    return Array.from({ length: Math.max(0, count) }, (_, index) => {
      const suffix = String(index + 1).padStart(2, "0");
      return `${floor}${suffix}`;
    });
  };

  const quoteEstimatesQuery = useQuery({
    queryKey: ["admin", "quote-estimates"],
    queryFn: () => getQuoteEstimates(),
  });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
    }, [queryClient]),
  );

  const quoteFilterQuery = useQuery({
    queryKey: ["manager", "quotes", projectType, propertyType, unitType],
    queryFn: () =>
      getManagerQuotes({
        projectType,
        propertyType,
        unitType,
      }),
    enabled: step === 1,
  });

  const quoteSelectorsQuery = useQuery({
    queryKey: ["manager", "quotes", "selectors"],
    queryFn: () => getQuoteSelectors(),
  });

  const quoteCategoriesQuery = useQuery({
    queryKey: ["manager", "quotes", "categories"],
    queryFn: () => getQuoteWorkCategories(),
    enabled: customItemModalVisible,
  });

  const quoteCatalogQuery = useQuery({
    queryKey: ["manager", "quotes", "catalog", projectType, propertyType, unitType],
    queryFn: () =>
      getQuoteWorkItems({
        projectType: projectType.toLowerCase(),
        propertyType: propertyType.toLowerCase(),
        unitType: unitType.toLowerCase(),
      }),
    enabled: step === 2,
  });

  const quoteWorkItemsQuery = useQuery({
    queryKey: ["manager", "quotes", "work-items", projectType, propertyType, unitType, customTitle],
    queryFn: () =>
      getQuoteWorkItems({
        projectType: projectType.toLowerCase(),
        propertyType: propertyType.toLowerCase(),
        unitType: unitType.toLowerCase(),
        search: customTitle.trim() || undefined,
      }),
    enabled: customItemModalVisible,
  });

  const defaultClientName = currentUser?.fullName || currentUser?.name || "";
  const defaultEmail = currentUser?.email || "";
  const defaultPhone = currentUser?.phone || "";
  const companiesQuery = useCompaniesQuery(1, 100);
  const companies = companiesQuery.data?.data ?? [];
  const isManager = currentUser?.role === "manager";
  const canManageQuoteFinancials = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const selectedCompany = companies.find((company) => company.id === companyId);
  const companyName = selectedCompany?.name ?? "";
  const backendQuotes = quoteFilterQuery.data?.quotes ?? [];
  const quoteSelectors = quoteSelectorsQuery.data;
  const quoteCatalogGroups = quoteCatalogQuery.data ?? [];
  const quoteEstimatesList: QuoteEstimateResponse[] = quoteEstimatesQuery.data ?? [];
  const filteredQuoteEstimates = useMemo(() => {
    if (selectedStatusFilter === "all") return quoteEstimatesList;
    return quoteEstimatesList.filter(
      (q: QuoteEstimateResponse) => (q.status || "").toLowerCase() === selectedStatusFilter.toLowerCase(),
    );
  }, [quoteEstimatesList, selectedStatusFilter]);

  const toSelectorOption = (item: QuoteSelectorOption, fallbackIndex: number) => ({
    id: item.id ?? item.value ?? item.name ?? String(fallbackIndex),
    name: item.name ?? item.label ?? item.value ?? "",
    value: item.value ?? item.name ?? item.label ?? "",
  });

  const categoryOptions = (quoteCategoriesQuery.data ?? []).map(toSelectorOption);
  const measurementOptions = (quoteSelectors?.measurementTypes ?? []).map(toSelectorOption);
  const workItemSuggestions = (quoteWorkItemsQuery.data ?? []).flatMap(
    (group: QuoteWorkItemGroup | any) => group.data || [],
  );

  const backendWorkGroups = useMemo(
    () =>
      quoteCatalogGroups.map((group: QuoteWorkItemGroup, index: number) => ({
        id: group.category.id,
        title: group.category.name,
        expanded: index === 0,
        items: group.data.map((item, itemIndex) => ({
          id: item.id || group.category.id + "-" + itemIndex,
          title: item.name,
          quantity: "1",
          unitOptions: [{ unit: item.measurementType ?? "pcs", price: canManageQuoteFinancials ? Number((item as any).unitCost ?? (item as any).unitPrice ?? 0) : 0 }],
          selectedUnit: item.measurementType ?? "pcs",
          selectedUnitPrice: canManageQuoteFinancials ? Number((item as any).unitCost ?? (item as any).unitPrice ?? 0) : 0,
          selected: false,
          isCustom: false,
        })),
      })),
    [canManageQuoteFinancials, quoteCatalogGroups],
  );

  useEffect(() => {
    if (step !== 2) return;
    setWorkGroups((prev) => {
      if (prev.length === 0 && backendWorkGroups.length > 0) {
        return backendWorkGroups;
      }
      return prev;
    });
  }, [backendWorkGroups, step]);

  const { subtotal, itemsSelected } = useMemo(
    () => calculateQuoteWorkTotals(workGroups),
    [workGroups],
  );

  const discountAmount = useMemo(
    () => subtotal * (appliedDiscountPercent / 100),
    [subtotal, appliedDiscountPercent],
  );
  const finalTotal = subtotal - discountAmount;
  const validUntilLabel = getValidUntilLabel();
  const projectDetailsLabel = `${projectType} • ${propertyType}`;
  const projectMetaLabel = "";

  const buildEstimatePayload = () => {
    const selectedTasks = workGroups.flatMap((group) =>
      group.items
        .filter((item) => item.selected)
        .map((item, index) => ({
          title: item.title,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit: item.selectedUnit || "each",
          unitPrice: canManageQuoteFinancials ? Number(item.selectedUnitPrice) || 0 : 0,
          estimatedHours: item.estimatedHours
            ? Number(item.estimatedHours)
            : estimatedTime
              ? Number(estimatedTime) || undefined
              : undefined,
          sortOrder: index,
          scopeChecklist: item.scopeChecklist,
          locationMode:
            item.locationMode ||
            (item.plannedLocationKeys?.length ? "selected" : "all"),
          selectedFloorNumbers: item.selectedFloorNumbers,
          selectedUnitNames: item.selectedUnitNames,
          plannedLocationKeys: item.plannedLocationKeys,
        })),
    );
    const plannedFloors = plannedFloorNumbers.map((floor) => ({
      id: `floor-${floor}`,
      label: `Floor ${floor}`,
      floorNumber: floor,
      selected: true,
      units: getPlannedUnitNames(floor).map((unitName) => ({
        id: `floor-${floor}-unit-${unitName}`,
        label: unitName,
        selected: true,
      })),
    }));

    return {
      companyId,
      projectName: projectName.trim(),
      clientName: (clientName || defaultClientName).trim(),
      clientEmail: (email || defaultEmail).trim() || undefined,
      clientPhone: (phoneNumber || defaultPhone).trim() || undefined,
      projectAddress: projectAddress.trim() || undefined,
      projectType: projectType.toLowerCase().replace(/\s+/g, "_"),
      propertyType: propertyType.toLowerCase().replace(/\s+/g, "_"),
      unitType: unitType.toLowerCase().replace(/\s+/g, "_"),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      floorsCount: floorsCount ? Number(floorsCount) : undefined,
      unitsPerFloor: unitsPerFloor ? Number(unitsPerFloor) : undefined,
      floorStart: floorsCount ? 1 : undefined,
      floorEnd: floorsCount ? Number(floorsCount) : undefined,
      unitStart: unitsPerFloor ? 1 : undefined,
      unitEnd: unitsPerFloor ? Number(unitsPerFloor) : undefined,
      discountAmount: discountAmount || 0,
      tasks: selectedTasks,
      schemaVersion: 2,
      quotationDetails: quotationDetailsChanged
        ? quotationDetailsText.trim()
          ? [{ heading: false, bullet: false, runs: [{ text: quotationDetailsText.trim() }] }]
          : []
        : Array.isArray(editingQuote?.quotationDetails) ? editingQuote.quotationDetails : [],
      buildingPlan: {
        totalFloors: Number(floorsCount) || 0,
        capacity: Number(unitsPerFloor) || 0,
        floorMode: "Standard",
        customLabels: "",
        pattern: "floor",
        start: 1,
        digits: 2,
        separator: "",
        floors: plannedFloors,
      },
      pricingConfig: { services: selectedTasks },
    };
  };

  const validateDraft = () => {
    if (!companyId) return "Company is required.";
    if (!projectName.trim()) return "Project name is required.";
    if (!(clientName || defaultClientName).trim()) return "Client name is required.";
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return "End date cannot be earlier than start date.";
    }
    return null;
  };

  const handleSaveDraft = async () => {
    const validationError = validateDraft();
    if (validationError) {
      toast.error(validationError);
      return null;
    }
    try {
      setIsSavingDraft(true);
      const payload = buildEstimatePayload();
      const saved = editingQuote
        ? await updateQuoteEstimate(editingQuote.id, payload)
        : await createQuoteEstimate(payload);
      setEditingQuote(saved);
      await queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
      toast.success(`Quote #${saved.quoteNumber || "draft"} saved.`);
      return saved;
    } catch (error: any) {
      toast.error(error?.message || "Unable to save quote draft.");
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleOpenEstimate = async (summary: QuoteEstimateResponse) => {
    try {
      const quote = await getQuoteEstimate(summary.id);
      setEditingQuote(quote);
      setCompanyId(quote.companyId || "");
      setProjectName(quote.projectName || "");
      setClientName(quote.clientName || "");
      setEmail(quote.clientEmail || "");
      setPhoneNumber(quote.clientPhone || "");
      setProjectAddress(quote.projectAddress || "");
      setStartDate(quote.startDate?.slice(0, 10) || "");
      setEndDate(quote.endDate?.slice(0, 10) || "");
      const detailsText = Array.isArray(quote.quotationDetails)
        ? quote.quotationDetails
            .flatMap((block: any) => Array.isArray(block?.runs) ? block.runs : [])
            .map((run: any) => String(run?.text || ""))
            .join("\n")
        : "";
      setQuotationDetailsText(detailsText);
      setQuotationDetailsChanged(false);
      setFloorsCount(String(quote.floorsCount ?? ""));
      setUnitsPerFloor(String(quote.unitsPerFloor ?? ""));
      setFloorStart(String(quote.floorStart ?? "1"));
      setFloorEnd(String(quote.floorEnd ?? ""));
      setUnitStart(String(quote.unitStart ?? "101"));
      setUnitEnd(String(quote.unitEnd ?? ""));
      const toTitle = (value?: string | null) =>
        (value || "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const nextProjectType = toTitle(quote.projectType) === "Renovations" ? "Renovations" : "New Build";
      const nextPropertyType = toTitle(quote.propertyType) === "Commercial" ? "Commercial" : "Residential";
      const nextUnitType = toTitle(quote.unitType) === "Apartment" ? "Apartment" : "House";
      setProjectType(nextProjectType);
      setPropertyType(nextPropertyType);
      setUnitType(nextUnitType);
      setAppliedDiscountPercent(
        quote.subtotal > 0 ? (Number(quote.discountAmount || 0) / Number(quote.subtotal)) * 100 : 0,
      );
      setWorkGroups([{
        id: `saved-${quote.id}`,
        title: "Saved Services",
        expanded: true,
        items: (Array.isArray(quote.tasks) ? quote.tasks : []).map((task) => ({
          id: task.id,
          title: task.title,
          quantity: String(task.quantity ?? 1),
          unitOptions: [{ unit: task.unit || "each", price: Number(task.unitPrice || 0) }],
          selectedUnit: task.unit || "each",
          selectedUnitPrice: Number(task.unitPrice || 0),
          selected: true,
          isCustom: false,
          description: task.description || undefined,
          estimatedHours: task.estimatedHours != null ? String(task.estimatedHours) : undefined,
          scopeChecklist: Array.isArray(task.scopeChecklist) ? task.scopeChecklist : undefined,
          locationMode: task.locationMode || undefined,
          selectedFloorNumbers: Array.isArray(task.selectedFloorNumbers) ? task.selectedFloorNumbers : undefined,
          selectedUnitNames: Array.isArray(task.selectedUnitNames) ? task.selectedUnitNames : undefined,
          plannedLocationKeys: Array.isArray(task.plannedLocationKeys) ? task.plannedLocationKeys : undefined,
        })),
      }]);
      setStep(1);
      setActiveTab("builder");
    } catch (error: any) {
      toast.error(error?.message || "Unable to open this quote.");
    }
  };

  const quoteParams = {
    companyName,
    projectName,
    clientName,
    email,
    phoneNumber,
    projectAddress,
    projectType,
    propertyType,
    unitType,
    startDate,
    endDate,
    floorsCount,
    unitsPerFloor,
    estimatedTime: estimatedTime || "",
    projectMetaLabel,
    validUntilLabel,
    workGroups,
    subtotal,
    discountAmount,
    finalTotal,
  };

  const syncCombination = (
    nextProjectType: QuoteProjectType,
    nextPropertyType: QuotePropertyType,
    nextUnitType: QuoteUnitType,
  ) => {
    setProjectType(nextProjectType);
    setPropertyType(nextPropertyType);
    setUnitType(nextUnitType);
    setWorkGroups([]);
  };

  const handleConvertEstimate = async (quote: QuoteEstimateResponse) => {
    try {
      setIsConvertingId(quote.id);
      await acceptAndCreateProject(quote.id, {
        acceptedByName: currentUser?.fullName || "Admin",
        notes: "Accepted from mobile app",
      });
      toast.success(`Project created from Quote #${quote.quoteNumber}!`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
    } catch (err: any) {
      console.error("Convert quote error:", err);
      toast.error(err?.message || "Failed to convert quote to project.");
    } finally {
      setIsConvertingId(null);
    }
  };

  const handleSendEstimate = async (quote: QuoteEstimateResponse) => {
    try {
      setIsSendingId(quote.id);
      await sendQuoteEstimate(quote.id);
      toast.success(`Quote #${quote.quoteNumber} sent to client!`);
      void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to send quote.");
    } finally {
      setIsSendingId(null);
    }
  };

  const handleGeneratePdf = async () => {
    const resolvedEmail = email.trim();

    if (!companyId) {
      toast.error("Company is required.");
      return;
    }
    if (!projectName.trim()) {
      toast.error("Project name is required.");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Client name is required.");
      return;
    }
    if (!projectAddress.trim()) {
      toast.error("Project address is required.");
      return;
    }
    if (!resolvedEmail) {
      toast.error("Client email is required to send the quote.");
      return;
    }
    if (buildEstimatePayload().tasks.length === 0) {
      toast.error("Please select or add at least one service/task.");
      return;
    }

    try {
      setIsGeneratingQuote(true);

      const createdQuote = await handleSaveDraft();
      if (!createdQuote) return;
      await sendQuoteEstimate(createdQuote.id);

      const resolvedQuoteNumber =
        createdQuote?.quoteNumber ||
        (createdQuote as any)?.quote?.quoteNumber ||
        "";
      const pdfFile = await downloadQuoteEstimatePdf(
        createdQuote.id,
        resolvedQuoteNumber || undefined,
      );
      const pdfName = pdfFile.name;

      void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });

      setCurrentPreviewDocument({
        id: createdQuote?.id || (createdQuote as any)?.quote?.id || `quote-preview-${Date.now()}`,
        name: pdfName,
        uri: pdfFile.uri,
        mimeType: "application/pdf",
      });
      router.push("/screens/company/documentpreview");
      toast.success(
        resolvedQuoteNumber
          ? `Quote #${resolvedQuoteNumber} created and sent!`
          : "Quote created and sent!"
      );
    } catch (error: any) {
      console.error("Quote creation error:", error);
      toast.error(error?.message || "Unable to generate and send the quote right now.");
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const handleAddCustomItem = () => {
    if (!customTitle.trim()) {
      toast.error("Enter a service name for the custom item.");
      return;
    }

    if (!customMeasurementType) {
      toast.error("Select a unit of measurement.");
      return;
    }

    const nextQuantity = Number(customQuantity) || 1;
    const nextUnitPrice = Number(customUnitPrice) || 0;

    const selectedCategory = categoryOptions.find(
      (item) => item.id === customCategoryId || item.value === customCategoryId,
    );

    const addQuoteRequest = customCategoryId
      ? quickAddQuoteWorkItem({
        categoryId: customCategoryId,
        projectType: projectType.toLowerCase(),
        propertyType: propertyType.toLowerCase(),
        unitType: unitType.toLowerCase(),
        name: customTitle.trim(),
        measurementType: customMeasurementType,
        quantity: nextQuantity,
        unitCost: nextUnitPrice,
        notes: "",
      }).then((createdQuote) => createdQuote.quote)
      : createManagerQuote({
        projectType: projectType.toLowerCase(),
        propertyType: propertyType.toLowerCase(),
        unitType: unitType.toLowerCase(),
        title: customTitle.trim(),
        quantity: nextQuantity,
        unit: customMeasurementType,
        unitPrice: nextUnitPrice,
        notes: "",
        isCustom: true,
      });

    addQuoteRequest
      .then((createdQuote) => {
        const measurementLabel = measurementOptions.find(
          (item) => item.value === customMeasurementType || item.name === customMeasurementType,
        )?.name ?? customMeasurementType;

        setWorkGroups((current) =>
          addCustomQuoteWorkItem(
            current,
            customCategoryId || "custom-quotes",
            selectedCategory?.name ?? "Custom Items",
            createdQuote.id,
            createdQuote.title,
            String(createdQuote.quantity),
            createdQuote.unit ?? measurementLabel,
            String(createdQuote.unitPrice),
          ),
        );
        void queryClient.fetchQuery({
          queryKey: ["manager", "quotes", projectType, propertyType, unitType],
          queryFn: () =>
            getManagerQuotes({
              projectType,
              propertyType,
              unitType,
            }),
        });
        setCustomTitle("");
        setCustomQuantity("1");
        setCustomCategoryId("");
        setCustomMeasurementType("");
        setCustomUnitPrice("0");
        setCustomItemModalVisible(false);
      })
      .catch(() => {
        toast.error("Unable to add the custom item right now.");
      });
  };

  const handleOpenEditItem = (groupId: string, itemId: string) => {
    const currentGroup = workGroups.find((group) => group.id === groupId);
    const currentItem = currentGroup?.items.find((item) => item.id === itemId);
    if (!currentItem) return;

    setEditGroupId(groupId);
    setEditItemId(itemId);
    setEditTitle(currentItem.title);
    setEditQuantity(currentItem.quantity);
    setEditUnit(currentItem.selectedUnit);
    setEditUnitPrice(String(currentItem.selectedUnitPrice));
    setEditHours(currentItem.estimatedHours || "");
    setEditDescription(currentItem.description || "");
    setEditSelectedFloors(
      currentItem.selectedFloorNumbers && currentItem.selectedFloorNumbers.length > 0
        ? currentItem.selectedFloorNumbers
        : plannedFloorNumbers.length > 0
          ? [...plannedFloorNumbers]
          : [],
    );
    setEditLocationKeys(currentItem.plannedLocationKeys || []);
    setEditChecklist(currentItem.scopeChecklist || []);
    setEditModalVisible(true);
  };

  const handleDeleteEstimate = (quote: QuoteEstimateResponse) => {
    Alert.alert(
      "Delete Quote",
      `Are you sure you want to delete quote #${quote.quoteNumber || ""}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteQuoteEstimate(quote.id);
              toast.success(`Quote #${quote.quoteNumber || ""} deleted successfully!`);
              void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
            } catch (err: any) {
              console.error("Delete estimate error:", err);
              toast.error(err?.message || "Failed to delete quote estimate.");
            }
          },
        },
      ],
    );
  };

  const resetQuoteBuilder = () => {
    if (isManager && !companiesQuery.isLoading && companies.length === 0) {
      toast.error("You must be assigned to a company or project before creating a quotation.");
      return;
    }
    setEditingQuote(null);
    setStep(1);
    setCompanyId("");
    setProjectName("");
    setClientName("");
    setProjectAddress("");
    setPhoneNumber("");
    setEmail("");
    setEstimatedTime("");
    setQuotationDetailsText("");
    setQuotationDetailsChanged(false);
    setStartDate("");
    setEndDate("");
    setFloorsCount("");
    setUnitsPerFloor("");
    setFloorStart("1");
    setFloorEnd("");
    setUnitStart("101");
    setUnitEnd("");
    setWorkGroups([]);
    setAppliedDiscountPercent(0);
    setActiveTab("builder");
  };

  const handleQuoteStatusAction = (
    quote: QuoteEstimateResponse,
    action: "reject" | "cancel",
  ) => {
    Alert.alert(
      `${action === "reject" ? "Reject" : "Cancel"} Quote`,
      `Are you sure you want to ${action} #${quote.quoteNumber}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: action === "reject" ? "Reject" : "Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              if (action === "reject") await rejectQuoteEstimate(quote.id);
              else await cancelQuoteEstimate(quote.id);
              await queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
              toast.success(`Quote ${action === "reject" ? "rejected" : "cancelled"}.`);
            } catch (error: any) {
              toast.error(error?.message || `Unable to ${action} quote.`);
            }
          },
        },
      ],
    );
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    console.log("Deleting quote item:", { groupId, itemId });

    const currentGroup = workGroups.find((g) => g.id === groupId);
    const currentItem = currentGroup?.items.find((i) => i.id === itemId);

    if (currentItem?.isCustom) {
      deleteManagerQuote(itemId)
        .then(() => {
          setWorkGroups((current) =>
            deleteQuoteWorkItem(current, groupId, itemId),
          );
          void queryClient.fetchQuery({
            queryKey: ["manager", "quotes", projectType, propertyType, unitType],
            queryFn: () =>
              getManagerQuotes({
                projectType,
                propertyType,
                unitType,
              }),
          });
          toast.success("Quote item removed.");
        })
        .catch((error) => {
          console.error("Failed to delete quote item:", error);
          toast.error("Unable to remove the quote item right now.");
        });
    } else {
      setWorkGroups((current) =>
        deleteQuoteWorkItem(current, groupId, itemId),
      );
      toast.success("Quote item removed.");
    }
  };

  const handleSaveEditItem = () => {
    if (!editTitle.trim()) {
      toast.error("Enter a service name for the item.");
      return;
    }

    const nextQuantity = Number(editQuantity) || 1;
    const nextUnitPrice = Number(editUnitPrice) || 0;

    setWorkGroups((current) =>
      updateQuoteWorkItemDetails(current, editGroupId, editItemId, {
        title: editTitle.trim(),
        quantity: String(nextQuantity),
        unit: editUnit,
        unitPrice: String(nextUnitPrice),
        description: editDescription.trim() || undefined,
        estimatedHours: editHours.trim() || undefined,
        selectedFloorNumbers: editSelectedFloors,
        plannedLocationKeys: editLocationKeys,
        scopeChecklist: editChecklist,
        locationMode: editLocationKeys.length > 0 ? "selected" : "all",
      }),
    );
    setEditModalVisible(false);
    toast.success("Service updated with location scope!");
  };

  return (
    <SafeAreaView edges={['top', 'left', "right"]} className="flex-1 bg-[#E9EDF1]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 360 }}
          refreshControl={
            <RefreshControl
              refreshing={
                quoteEstimatesQuery.isRefetching ||
                (activeTab === "builder" && quoteFilterQuery.isRefetching)
              }
              onRefresh={() => {
                void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
                if (activeTab === "builder" && step === 1) {
                  void queryClient.invalidateQueries({
                    queryKey: ["manager", "quotes", projectType, propertyType, unitType],
                  });
                }
              }}
              tintColor="#1F5577"
              colors={["#1F5577"]}
            />
          }
        >
          <View className="px-5 pt-5">
            <Text className="text-center text-[18px] font-semibold text-[#2B2B2B]">
              Quotes
            </Text>
          </View>

          <View className="mx-5 mt-5 flex-row rounded-[14px] border border-[#CBD5E1] bg-white p-1">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setActiveTab("quotes");
                void queryClient.invalidateQueries({ queryKey: ["admin", "quote-estimates"] });
              }}
              className={`h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] ${activeTab === "quotes" ? "bg-[#1F5577]" : "bg-white"}`}
            >
              <Ionicons name="document-text-outline" size={17} color={activeTab === "quotes" ? "#FFFFFF" : "#64748B"} />
              <Text className={`text-[12px] font-semibold ${activeTab === "quotes" ? "text-white" : "text-[#64748B]"}`}>
                Saved Quotations
              </Text>
              {quoteEstimatesList.length > 0 ? (
                <View className={`rounded-full px-1.5 py-0.5 ${activeTab === "quotes" ? "bg-white/20" : "bg-[#E2E8F0]"}`}>
                  <Text className={`text-[10px] font-bold ${activeTab === "quotes" ? "text-white" : "text-[#475569]"}`}>
                    {quoteEstimatesList.length}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (isManager && !companiesQuery.isLoading && companies.length === 0) {
                  toast.error("You must be assigned to a company or project before creating a quotation.");
                  return;
                }
                setActiveTab("builder");
              }}
              className={`h-11 flex-1 flex-row items-center justify-center gap-2 rounded-[10px] ${activeTab === "builder" ? "bg-[#1F5577]" : "bg-white"}`}
            >
              <Ionicons name="construct-outline" size={17} color={activeTab === "builder" ? "#FFFFFF" : "#64748B"} />
              <Text className={`text-[13px] font-semibold ${activeTab === "builder" ? "text-white" : "text-[#64748B]"}`}>
                Quote Builder
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "builder" ? (
            <View className="mt-6 px-5">
              <View className="rounded-[20px] border border-[#D7E0E8] bg-white px-5 py-5 shadow-sm">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[18px] font-semibold text-[#1F2937]">
                      Construction Quote Builder
                    </Text>
                    {editingQuote ? (
                      <Text className="mt-1 text-[12px] font-semibold text-[#1F5577]">
                        Editing #{editingQuote.quoteNumber}
                      </Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => void handleSaveDraft()}
                    disabled={isSavingDraft || isGeneratingQuote}
                    className="min-w-[96px] flex-row items-center justify-center rounded-[11px] border border-[#1F5577] bg-white px-3 py-2.5"
                  >
                    {isSavingDraft ? <ActivityIndicator size="small" color="#1F5577" /> : (
                      <Text className="text-[12px] font-semibold text-[#1F5577]">Save Draft</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <View className="mt-5">
                  <QuoteStepIndicator currentStep={step} totalSteps={6} />
                  <Text className="mt-3 text-center text-[12px] font-bold uppercase tracking-wider text-[#1F5577]">
                    {quotationStepLabels[step - 1]}
                  </Text>
                </View>
              </View>

              {step === 1 ? (
                <QuoteBuilderForm
                  mode="project"
                  companyName={companyName}
                  companyId={companyId}
                  isCompaniesLoading={companiesQuery.isLoading}
                  onOpenCompanyPicker={() => {
                    void queryClient.invalidateQueries({ queryKey: ["companies"] });
                    setCompanySheetVisible(true);
                  }}
                  projectName={projectName}
                  setProjectName={setProjectName}
                  clientName={clientName}
                  setClientName={setClientName}
                  projectAddress={projectAddress}
                  setProjectAddress={setProjectAddress}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  email={email}
                  setEmail={setEmail}
                  defaultClientName={defaultClientName}
                  defaultPhone={defaultPhone}
                  defaultEmail={defaultEmail}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  floorsCount={floorsCount}
                  setFloorsCount={setFloorsCount}
                  unitsPerFloor={unitsPerFloor}
                  setUnitsPerFloor={setUnitsPerFloor}
                  floorStart={floorStart}
                  setFloorStart={setFloorStart}
                  floorEnd={floorEnd}
                  setFloorEnd={setFloorEnd}
                  unitStart={unitStart}
                  setUnitStart={setUnitStart}
                  unitEnd={unitEnd}
                  setUnitEnd={setUnitEnd}
                  projectType={projectType}
                  setProjectType={(value) =>
                    syncCombination(value, propertyType, unitType)
                  }
                  propertyType={propertyType}
                  setPropertyType={(value) =>
                    syncCombination(projectType, value, unitType)
                  }
                  unitType={unitType}
                  setUnitType={(value) =>
                    syncCombination(projectType, propertyType, value)
                  }
                  onNext={() => {
                    if (!companyId) {
                      toast.error("Company is required.");
                      return;
                    }
                    if (!projectName.trim()) {
                      toast.error("Project name is required.");
                      return;
                    }
                    if (!clientName.trim() && !defaultClientName) {
                      toast.error("Client name is required.");
                      return;
                    }
                    if (!projectAddress.trim()) {
                      toast.error("Project address is required.");
                      return;
                    }
                    setStep(2);
                  }}
                />
              ) : step === 2 ? (
                <View className="rounded-[20px] border border-[#D7E0E8] bg-white p-5">
                  <Text className="text-[18px] font-bold text-[#1F2937]">Quotation Details & Terms</Text>
                  <Text className="mt-1 text-[13px] leading-5 text-[#64748B]">
                    Add scope of work, warranties, exclusions, and custom quotation clauses.
                  </Text>
                  <TextInput
                    value={quotationDetailsText}
                    onChangeText={(value) => {
                      setQuotationDetailsText(value);
                      setQuotationDetailsChanged(true);
                    }}
                    placeholder="Enter quotation details and terms..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    textAlignVertical="top"
                    className="mt-4 min-h-[220px] rounded-[14px] border border-[#CBD5E1] bg-[#F8FAFC] p-4 text-[14px] leading-6 text-[#1F2937]"
                  />
                  <View className="mt-5 flex-row gap-3">
                    <TouchableOpacity onPress={() => setStep(1)} className="h-[52px] flex-1 items-center justify-center rounded-[13px] border border-[#CBD5E1] bg-white">
                      <Text className="font-semibold text-[#475569]">Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep(3)} className="h-[52px] flex-1 items-center justify-center rounded-[13px] bg-[#1F5577]">
                      <Text className="font-semibold text-white">Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : step === 3 ? (
                <QuoteBuilderForm
                  mode="building"
                  companyName={companyName}
                  companyId={companyId}
                  isCompaniesLoading={companiesQuery.isLoading}
                  onOpenCompanyPicker={() => setCompanySheetVisible(true)}
                  projectName={projectName}
                  setProjectName={setProjectName}
                  clientName={clientName}
                  setClientName={setClientName}
                  projectAddress={projectAddress}
                  setProjectAddress={setProjectAddress}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  email={email}
                  setEmail={setEmail}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  floorsCount={floorsCount}
                  setFloorsCount={setFloorsCount}
                  unitsPerFloor={unitsPerFloor}
                  setUnitsPerFloor={setUnitsPerFloor}
                  floorStart={floorStart}
                  setFloorStart={setFloorStart}
                  floorEnd={floorEnd}
                  setFloorEnd={setFloorEnd}
                  unitStart={unitStart}
                  setUnitStart={setUnitStart}
                  unitEnd={unitEnd}
                  setUnitEnd={setUnitEnd}
                  projectType={projectType}
                  setProjectType={(value) => syncCombination(value, propertyType, unitType)}
                  propertyType={propertyType}
                  setPropertyType={(value) => syncCombination(projectType, value, unitType)}
                  unitType={unitType}
                  setUnitType={(value) => syncCombination(projectType, propertyType, value)}
                  onBack={() => setStep(2)}
                  onNext={() => {
                    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
                      toast.error("End date cannot be earlier than start date.");
                      return;
                    }
                    if (floorsCount && Number(floorsCount) < 1) {
                      toast.error("Total floors must be at least 1.");
                      return;
                    }
                    if (unitsPerFloor && Number(unitsPerFloor) < 1) {
                      toast.error("Units per floor must be at least 1.");
                      return;
                    }
                    setStep(4);
                  }}
                />
              ) : step === 4 ? (
                <View className="rounded-[20px] border border-[#D7E0E8] bg-white p-5">
                  <Text className="text-[18px] font-bold text-[#1F2937]">Workable Area</Text>
                  <Text className="mt-1 text-[13px] leading-5 text-[#64748B]">
                    Review the floors and units generated from the building details.
                  </Text>
                  <View className="mt-4 gap-3">
                    {plannedFloorNumbers.length === 0 ? (
                      <Text className="rounded-[12px] bg-[#F8FAFC] p-4 text-[13px] text-[#64748B]">No floor range configured.</Text>
                    ) : plannedFloorNumbers.map((floor) => (
                      <View key={floor} className="rounded-[14px] border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                        <Text className="font-bold text-[#1F2937]">Floor {floor}</Text>
                        <Text className="mt-1 text-[12px] text-[#64748B]">
                          {getPlannedUnitNames(floor).length > 0 ? getPlannedUnitNames(floor).join(", ") : "No units configured"}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View className="mt-5 flex-row gap-3">
                    <TouchableOpacity onPress={() => setStep(3)} className="h-[52px] flex-1 items-center justify-center rounded-[13px] border border-[#CBD5E1] bg-white">
                      <Text className="font-semibold text-[#475569]">Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setStep(5)} className="h-[52px] flex-1 items-center justify-center rounded-[13px] bg-[#1F5577]">
                      <Text className="font-semibold text-white">Next</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : step === 5 ? (
                <QuoteWorkItemsStep
                  showFinancials={canManageQuoteFinancials}
                  catalogTitle={
                    quoteCatalogGroups.length
                      ? "Work Item Categories"
                      : "No Work Item Categories"
                  }
                  catalogDescription={
                    quoteCatalogGroups.length
                      ? "These category groups are loaded from the server."
                      : "No work items returned from the backend for this combination."
                  }
                  groups={workGroups}
                  subtotal={subtotal}
                  itemsSelected={itemsSelected}
                  estimatedTotal={subtotal}
                  estimatedTime={estimatedTime}
                  onChangeEstimatedTime={setEstimatedTime}
                  onAddCustomItem={() => setCustomItemModalVisible(true)}
                  onToggleGroup={(groupId) =>
                    setWorkGroups((current) =>
                      toggleQuoteWorkGroup(current, groupId),
                    )
                  }
                  onToggleItem={(groupId, itemId) =>
                    setWorkGroups((current) =>
                      toggleQuoteWorkItem(current, groupId, itemId),
                    )
                  }
                  onEditItem={handleOpenEditItem}
                  onDeleteItem={handleDeleteItem}
                  onChangeItemQuantity={(groupId, itemId, value) =>
                    setWorkGroups((current) =>
                      updateQuoteWorkItemQuantity(current, groupId, itemId, value),
                    )
                  }
                  onSelectItemUnit={(groupId, itemId, unit) =>
                    setWorkGroups((current) =>
                      updateQuoteWorkItemUnit(current, groupId, itemId, unit),
                    )
                  }
                  onBack={() => setStep(4)}
                  onNext={() => setStep(6)}
                />
              ) : (
                <QuoteFinalReviewStep
                  showFinancials={canManageQuoteFinancials}
                  clientName={clientName || defaultClientName}
                  companyName={companyName}
                  projectName={projectName}
                  email={email || defaultEmail}
                  phoneNumber={phoneNumber || defaultPhone}
                  projectAddress={projectAddress}
                  projectType={projectType}
                  propertyType={propertyType}
                  unitType={unitType}
                  estimatedTime={estimatedTime}
                  startDate={startDate}
                  endDate={endDate}
                  floorsCount={floorsCount}
                  unitsPerFloor={unitsPerFloor}
                  floorStart={floorStart}
                  floorEnd={floorEnd}
                  unitStart={unitStart}
                  unitEnd={unitEnd}
                  workGroups={workGroups}
                  subtotal={subtotal}
                  itemsSelected={itemsSelected}
                  discountAmount={discountAmount}
                  finalTotal={finalTotal}
                  validUntilLabel={validUntilLabel}
                  projectDetailsLabel={projectDetailsLabel}
                  projectMetaLabel={projectMetaLabel}
                  onEditSummary={() => setStep(1)}
                  onEditWorkItems={() => setStep(5)}
                  onOpenDiscount={() => {
                    setDiscountPercentInput(String(appliedDiscountPercent || 0));
                    setDiscountModalVisible(true);
                  }}
                  onGeneratePdf={handleGeneratePdf}
                  onEmailQuote={handleGeneratePdf}
                  isGenerating={isGeneratingQuote}
                />
              )}
            </View>
          ) : activeTab === "quotes" ? (
            <View className="mt-5 px-5">
              {/* Header with New Quote Button */}
              <View className="mb-4 flex-row items-center justify-between gap-3">
                <View className="flex-1 pr-2">
                  <Text className="text-[18px] font-bold text-[#1F2937]">
                    Saved Quotations
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-[#64748B]">
                    View, edit, send, or manage quotations created by your admin account
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    resetQuoteBuilder();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    borderRadius: 12,
                    backgroundColor: "#1F5577",
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#FFFFFF" }}>
                    New Quote
                  </Text>
                </Pressable>
              </View>

              {/* Status Filter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 8 }}
              >
                {[
                  { id: "all", label: "All" },
                  { id: "draft", label: "Draft" },
                  { id: "sent", label: "Sent" },
                  { id: "accepted", label: "Accepted" },
                  { id: "converted", label: "Converted" },
                ].map((chip) => {
                  const isSelected = selectedStatusFilter === chip.id;
                  return (
                    <Pressable
                      key={chip.id}
                      onPress={() => setSelectedStatusFilter(chip.id)}
                      style={{
                        borderRadius: 9999,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? "#1F5577" : "#D7E0E8",
                        backgroundColor: isSelected ? "#1F5577" : "#FFFFFF",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: isSelected ? "#FFFFFF" : "#64748B",
                        }}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Quote Estimates List */}
              {quoteEstimatesQuery.isLoading ? (
                <View className="items-center justify-center py-16">
                  <ActivityIndicator size="large" color="#1F5577" />
                  <Text className="mt-3 text-[14px] text-[#64748B]">
                    Loading quotes...
                  </Text>
                </View>
              ) : filteredQuoteEstimates.length === 0 ? (
                <View className="items-center justify-center rounded-[20px] border border-dashed border-[#CBD5E1] bg-white px-6 py-12">
                  <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
                  <Text className="mt-3 text-[16px] font-bold text-[#1F2937]">
                    No Quotes Found
                  </Text>
                  <Text className="mt-1 text-center text-[13px] text-[#64748B]">
                    {selectedStatusFilter === "all"
                      ? "You haven't created any quote estimates yet. Tap below to start building one."
                      : `No quote estimates currently match the "${selectedStatusFilter}" status.`}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedStatusFilter("all");
                      resetQuoteBuilder();
                    }}
                    className="mt-5 flex-row items-center gap-2 rounded-[12px] bg-[#1F5577] px-5 py-3"
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text className="text-[14px] font-semibold text-white">
                      Create New Quote
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredQuoteEstimates.map((quote: QuoteEstimateResponse) => {
                  const isConverting = isConvertingId === quote.id;
                  const isSending = isSendingId === quote.id;
                  const isConverted = quote.status === "converted";
                  const isAccepted = quote.status === "accepted";
                  const isSent = quote.status === "sent";

                  const resolvedCompanyName =
                    quote.company?.name ||
                    (quote.companyId === selectedCompany?.id
                      ? selectedCompany?.name
                      : null);

                  return (
                    <View
                      key={quote.id}
                      className="mb-4 rounded-[20px] border border-[#D7E0E8] bg-white p-5 shadow-sm overflow-hidden"
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1 min-w-0 pr-1">
                          <Text
                            className="text-[12px] font-bold uppercase tracking-wider text-[#1F5577]"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            #{quote.quoteNumber || "QUOTE"}
                          </Text>
                          <Text
                            className="mt-1 text-[17px] font-bold text-[#1F2937]"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {quote.projectName}
                          </Text>
                          {resolvedCompanyName && (
                            <Text
                              className="mt-0.5 text-[13px] text-[#64748B]"
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              Company:{" "}
                              <Text className="font-semibold text-[#1F5577]">
                                {resolvedCompanyName}
                              </Text>
                            </Text>
                          )}
                          <Text
                            className="mt-0.5 text-[13px] text-[#64748B]"
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            Client:{" "}
                            <Text className="font-semibold text-[#334155]">
                              {quote.clientName}
                            </Text>
                          </Text>
                        </View>

                        {/* Status Badge */}
                        <View
                          style={{ flexShrink: 0 }}
                          className={`rounded-full px-3 py-1 border ${isConverted
                              ? "bg-emerald-50 border-emerald-200"
                              : isAccepted
                                ? "bg-blue-50 border-blue-200"
                                : isSent
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-slate-100 border-slate-200"
                            }`}
                        >
                          <Text
                            className={`text-[11px] font-bold uppercase tracking-wider ${isConverted
                                ? "text-emerald-700"
                                : isAccepted
                                  ? "text-blue-700"
                                  : isSent
                                    ? "text-amber-700"
                                    : "text-slate-600"
                              }`}
                          >
                            {quote.status}
                          </Text>
                        </View>
                      </View>

                      {/* Scope Details */}
                      <View className="mt-3.5 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                        <View className="flex-row items-center justify-between gap-2">
                          <View className="flex-1 flex-row items-center gap-1.5 min-w-0">
                            <Ionicons
                              name="business-outline"
                              size={14}
                              color="#64748B"
                            />
                            <Text
                              className="flex-1 text-[12px] capitalize text-[#475569]"
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {(quote.projectType || "").replace(/_/g, " ")} •{" "}
                              {(quote.propertyType || "").replace(/_/g, " ")}
                            </Text>
                          </View>
                          <View style={{ flexShrink: 0 }} className="flex-row items-center gap-1.5">
                            <Ionicons
                              name="layers-outline"
                              size={14}
                              color="#64748B"
                            />
                            <Text className="text-[12px] text-[#475569]">
                              {quote.floorsCount ?? 0} floors •{" "}
                              {quote.unitsPerFloor ?? 0} units
                            </Text>
                          </View>
                        </View>

                        {quote.projectAddress && (
                          <View className="mt-2 flex-row items-center gap-1.5">
                            <Ionicons
                              name="location-outline"
                              size={14}
                              color="#64748B"
                            />
                            <Text
                              className="flex-1 text-[12px] text-[#64748B]"
                              numberOfLines={1}
                            >
                              {quote.projectAddress}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Pricing & Actions */}
                      <View className="mt-4 border-t border-[#F1F5F9] pt-3">
                        {/* Top Row: Items count + Total Price on left, Delete button on right */}
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                              Items ({quote.tasks?.length ?? 0})
                            </Text>
                            {canManageQuoteFinancials ? (
                              <Text className="mt-0.5 text-[18px] font-black text-[#1F5577]">
                                {formatCurrency(Number(quote.totalAmount || 0))}
                              </Text>
                            ) : null}
                          </View>

                          {/* Delete Estimate Button - safely positioned inside card */}
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => {
                                if (quote.status === "converted" && quote.convertedProject?.id) {
                                  router.push({
                                    pathname: "/screens/company/projectdetails",
                                    params: { id: quote.convertedProject.id },
                                  });
                                } else {
                                  void handleOpenEstimate(quote);
                                }
                              }}
                              className="h-9 flex-row items-center justify-center gap-1 rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] px-3"
                            >
                              <Ionicons name="open-outline" size={15} color="#1F5577" />
                              <Text className="text-[12px] font-semibold text-[#1F5577]">
                                {quote.status === "converted" ? "Open Project" : "Edit"}
                              </Text>
                            </TouchableOpacity>
                            {quote.status !== "converted" && (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleDeleteEstimate(quote)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                className="h-9 w-9 items-center justify-center rounded-[10px] border border-red-200 bg-red-50"
                              >
                                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {/* Bottom Row: Actions (Send, Convert to Project or Project Created) */}
                        {canManageQuoteFinancials && !isConverted &&
                          quote.status !== "rejected" &&
                          quote.status !== "cancelled" ? (
                          <View className="mt-3 flex-row gap-2.5">
                            <Pressable
                              onPress={() => handleSendEstimate(quote)}
                              disabled={isSending}
                              style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "#CBD5E1",
                                backgroundColor: "#FFFFFF",
                                paddingVertical: 10,
                                paddingHorizontal: 8,
                              }}
                            >
                              {isSending ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#1F5577"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="mail-outline"
                                    size={15}
                                    color="#1F5577"
                                  />
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: "600",
                                      color: "#1F5577",
                                    }}
                                  >
                                    Send
                                  </Text>
                                </>
                              )}
                            </Pressable>

                            <Pressable
                              onPress={() => handleConvertEstimate(quote)}
                              disabled={isConverting}
                              style={{
                                flex: 1.5,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                borderRadius: 12,
                                backgroundColor: "#1F5577",
                                paddingVertical: 10,
                                paddingHorizontal: 8,
                              }}
                            >
                              {isConverting ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#FFFFFF"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={15}
                                    color="#FFFFFF"
                                  />
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      fontWeight: "600",
                                      color: "#FFFFFF",
                                    }}
                                  >
                                    Convert to Project
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          </View>
                        ) : isConverted ? (
                          <View className="mt-3 flex-row items-center justify-center gap-1.5 rounded-[12px] border border-emerald-200 bg-emerald-50 py-2.5">
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#059669"
                            />
                            <Text className="text-[13px] font-bold text-emerald-700">
                              Project Created
                            </Text>
                          </View>
                        ) : null}
                        {canManageQuoteFinancials && quote.status !== "converted" && quote.status !== "cancelled" && quote.status !== "rejected" ? (
                          <View className="mt-2 flex-row justify-end gap-3 px-1">
                            <TouchableOpacity onPress={() => handleQuoteStatusAction(quote, "reject")}>
                              <Text className="text-[12px] font-semibold text-red-600">Reject</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleQuoteStatusAction(quote, "cancel")}>
                              <Text className="text-[12px] font-semibold text-slate-500">Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ) : activeTab === "overview" ? (
            <QuoteOverviewTab selectors={quoteSelectors} />
          ) : activeTab === "categories" ? (
            <QuoteCategoriesTab />
          ) : activeTab === "measurements" ? (
            <QuoteMeasurementsTab />
          ) : activeTab === "items" ? (
            <QuoteWorkItemsTab />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={companySheetVisible}
        animationType="slide"
        onRequestClose={() => setCompanySheetVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setCompanySheetVisible(false)}
        >
          <Pressable
            style={{
              maxHeight: "80%",
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 32,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-[#CBD5E1]" />
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[18px] font-semibold text-[#1F2937]">
                  Select Company
                </Text>
                <Text className="mt-1 text-[13px] text-[#64748B]">
                  Choose from companies assigned to you.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCompanySheetVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <Text className="text-[18px] font-semibold text-[#334155]">✕</Text>
              </TouchableOpacity>
            </View>

            {companiesQuery.isLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color="#1F5577" />
                <Text className="mt-3 text-[14px] text-[#64748B]">
                  Loading companies...
                </Text>
              </View>
            ) : companies.length === 0 ? (
              <View className="rounded-[16px] border border-dashed border-[#CBD5E1] px-4 py-8">
                <Text className="text-center text-[14px] font-medium text-[#334155]">
                  No companies found
                </Text>
                <Text className="mt-2 text-center text-[13px] text-[#64748B]">
                  Ask your admin to assign you to a company or one of its projects.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                {companies.map((company) => {
                  const isSelected = company.id === companyId;

                  return (
                    <TouchableOpacity
                      key={company.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        setCompanyId(company.id);
                        setCompanySheetVisible(false);
                      }}
                      className={`mb-3 rounded-[16px] border px-4 py-4 ${isSelected
                          ? "border-[#1F5577] bg-[#EAF4FA]"
                          : "border-[#E2E8F0] bg-white"
                        }`}
                    >
                      <Text
                        className={`text-[15px] font-semibold ${isSelected ? "text-[#1F5577]" : "text-[#1F2937]"
                          }`}
                      >
                        {company.name}
                      </Text>
                      {!!company.address && (
                        <Text className="mt-1 text-[13px] text-[#64748B]" numberOfLines={1}>
                          {company.address}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <ApplyDiscountModal
        visible={discountModalVisible}
        value={discountPercentInput}
        onChangeValue={setDiscountPercentInput}
        discountAmountLabel={formatCurrency(
          subtotal * ((Number(discountPercentInput) || 0) / 100),
        )}
        onClose={() => setDiscountModalVisible(false)}
        onApply={() => {
          setAppliedDiscountPercent(Number(discountPercentInput) || 0);
          setDiscountModalVisible(false);
        }}
      />

      <AddCustomQuoteItemModal
        showFinancials={canManageQuoteFinancials}
        visible={customItemModalVisible}
        plannedFloorNumbers={plannedFloorNumbers}
        getPlannedUnitNames={getPlannedUnitNames}
        workItemSuggestions={workItemSuggestions}
        onClose={() => setCustomItemModalVisible(false)}
        onAddService={(service) => {
          setWorkGroups((current) =>
            addCustomQuoteWorkItem(
              current,
              "custom-quotes",
              "Custom Services",
              `service-${Date.now()}`,
              service.title,
              String(service.quantity),
              service.unit,
              service.unitPrice,
              {
                description: service.description,
                estimatedHours: service.estimatedHours,
                selectedFloorNumbers: service.selectedFloorNumbers,
                plannedLocationKeys: service.plannedLocationKeys,
                locationMode:
                  service.plannedLocationKeys.length > 0 ? "selected" : "all",
                scopeChecklist: service.allowSubtasks
                  ? ["Allow Subtasks"]
                  : undefined,
              },
            ),
          );
          setCustomItemModalVisible(false);
          toast.success("Service added to quote!");
        }}
      />

      {/* Edit Service Details and Location Scoping Modal */}
      <EditQuoteItemModal
        showFinancials={canManageQuoteFinancials}
        visible={editModalVisible}
        title={editTitle}
        quantity={editQuantity}
        unit={editUnit}
        unitPrice={editUnitPrice}
        estimatedHours={editHours}
        description={editDescription}
        plannedFloorNumbers={plannedFloorNumbers}
        getPlannedUnitNames={getPlannedUnitNames}
        selectedFloorNumbers={editSelectedFloors}
        plannedLocationKeys={editLocationKeys}
        scopeChecklist={editChecklist}
        onChangeTitle={setEditTitle}
        onChangeQuantity={setEditQuantity}
        onChangeUnit={setEditUnit}
        onChangeUnitPrice={setEditUnitPrice}
        onChangeEstimatedHours={setEditHours}
        onChangeDescription={setEditDescription}
        onChangeSelectedFloors={(floors, keys) => {
          setEditSelectedFloors(floors);
          setEditLocationKeys(keys);
        }}
        onChangePlannedLocationKeys={setEditLocationKeys}
        onChangeScopeChecklist={setEditChecklist}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEditItem}
      />
    </SafeAreaView>
  );
}





















