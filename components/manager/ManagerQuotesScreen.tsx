import React, { useMemo, useState , useEffect } from "react";

import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagerQuote,
  getManagerQuotes,
  getQuoteSelectors,
  getQuoteWorkCategories,
  getQuoteWorkItems,
  quickAddQuoteWorkItem,
  sendManagerQuoteMail,
  updateManagerQuote,
  type QuoteSelectorOption,
  type QuoteWorkItemGroup,
  type QuoteWorkItemLookup,
} from "@/api/manager/quotes.api";
import { setCurrentPreviewDocument } from "@/components/company/taskdetails/documentPreviewStore";
import { router } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner-native";
import AddCustomQuoteItemModal from "./quotes/AddCustomQuoteItemModal";
import ApplyDiscountModal from "./quotes/ApplyDiscountModal";
import QuoteBuilderForm from "./quotes/QuoteBuilderForm";
import QuoteFinalReviewStep from "./quotes/QuoteFinalReviewStep";
import {
  formatCurrency,
  type QuoteProjectType,
  type QuotePropertyType,
  type QuoteUnitType,
} from "./quotes/quoteTypes";
import { createQuotePdf } from "./quotes/quotePdf";
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

export default function ManagerQuotesScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [projectType, setProjectType] =
    useState<QuoteProjectType>("New Build");
  const [propertyType, setPropertyType] =
    useState<QuotePropertyType>("Residential");
  const [unitType, setUnitType] = useState<QuoteUnitType>("Apartment");
  const [workGroups, setWorkGroups] = useState<QuoteSelectedWorkGroup[]>([]);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
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
  const backendQuotes = quoteFilterQuery.data?.quotes ?? [];
  const quoteSelectors = quoteSelectorsQuery.data;
  const quoteCatalogGroups = quoteCatalogQuery.data ?? [];

  const toSelectorOption = (item: QuoteSelectorOption, fallbackIndex: number) => ({
    id: item.id ?? item.value ?? item.name ?? String(fallbackIndex),
    name: item.name ?? item.label ?? item.value ?? "",
    value: item.value ?? item.name ?? item.label ?? "",
  });

  const categoryOptions = (quoteCategoriesQuery.data ?? []).map(toSelectorOption);
  const measurementOptions = (quoteSelectors?.measurementTypes ?? []).map(toSelectorOption);
  const workItemSuggestions = (quoteWorkItemsQuery.data ?? []).flatMap((group) => group.data);

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
          unitOptions: [{ unit: item.measurementType ?? "pcs", price: Number((item as any).unitCost ?? (item as any).unitPrice ?? 0) }],
          selectedUnit: item.measurementType ?? "pcs",
          selectedUnitPrice: Number((item as any).unitCost ?? (item as any).unitPrice ?? 0),
          selected: false,
          isCustom: false,
        })),
      })),
    [quoteCatalogGroups],
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

  const quoteParams = {
    clientName,
    email,
    projectAddress,
    projectType,
    propertyType,
    unitType,
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

  const handleGeneratePdf = async () => {
    const resolvedEmail = email || defaultEmail;

    if (!resolvedEmail) {
      toast.error("Client email is required to send the quote.");
      return;
    }

    try {
      setIsGeneratingQuote(true);

      const pdfFile = await createQuotePdf(quoteParams);
      const pdfName = `quote-${Date.now()}.pdf`;

      await sendManagerQuoteMail({
        clientEmail: resolvedEmail,
        clientName: clientName || defaultClientName || undefined,
        subject: projectAddress || `${projectType} Project`,
        body: `Welcome ${clientName || defaultClientName || ""},

Client Name: ${clientName || defaultClientName || ""}
Client Email: ${resolvedEmail}
Phone Number: ${phoneNumber || defaultPhone || "N/A"}
Project Address: ${projectAddress || "N/A"}
Project Type: ${projectType}
Property Type: ${propertyType}
Unit Type: ${unitType}
Estimated Time: ${estimatedTime || "N/A"}

Please find the attached quote PDF.`,
      }, {
        uri: pdfFile.uri,
        name: pdfName,
        type: "application/pdf",
      });

      setCurrentPreviewDocument({
        id: `quote-preview-${Date.now()}`,
        name: pdfName,
        uri: pdfFile.uri,
        mimeType: "application/pdf",
      });
      router.push("/screens/company/documentpreview");
      toast.success("Quote generated and sent successfully.");
    } catch (error: any) {
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

    if (!customCategoryId) {
      toast.error("Select a category for the item.");
      return;
    }

    if (!customMeasurementType) {
      toast.error("Select a unit of measurement.");
      return;
    }

    const nextQuantity = Number(customQuantity) || 1;
    const nextUnitPrice = Number(customUnitPrice) || 0;

    quickAddQuoteWorkItem({
      categoryId: customCategoryId,
      projectType: projectType.toLowerCase(),
      propertyType: propertyType.toLowerCase(),
      unitType: unitType.toLowerCase(),
      name: customTitle.trim(),
      measurementType: customMeasurementType,
      quantity: nextQuantity,
      unitCost: nextUnitPrice,
      notes: "",
    })
      .then((createdQuote) => {
        const measurementLabel = measurementOptions.find(
          (item) => item.value === customMeasurementType || item.name === customMeasurementType,
        )?.name ?? customMeasurementType;

        const selectedCategory = categoryOptions.find(
          (item) => item.id === customCategoryId || item.value === customCategoryId,
        );

        setWorkGroups((current) =>
          addCustomQuoteWorkItem(
            current,
            customCategoryId,
            selectedCategory?.name ?? "Custom Items",
            createdQuote.quote.id,
            createdQuote.quote.title,
            String(createdQuote.quote.quantity),
            createdQuote.quote.unit ?? measurementLabel,
            String(createdQuote.quote.unitPrice),
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
    setCustomTitle(currentItem.title);
    setCustomQuantity(currentItem.quantity);
    setCustomMeasurementType(currentItem.selectedUnit);
    setCustomUnitPrice(String(currentItem.selectedUnitPrice));
    setCustomCategoryId("");
    setIsEditMode(true);
    setCustomItemModalVisible(true);
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    console.log("Deleting quote item:", { groupId, itemId });

    const currentGroup = workGroups.find((g) => g.id === groupId);
    const currentItem = currentGroup?.items.find((i) => i.id === itemId);

    if (currentItem?.isCustom) {
      // Real database ID - call backend API
      deleteManagerQuote(itemId)
        .then(() => {
          console.log("Quote item deleted successfully from backend:", itemId);
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
      // Fake/generated ID - just remove from local state
      console.log("Removing catalog item from local state (no backend delete):", itemId);
      setWorkGroups((current) =>
        deleteQuoteWorkItem(current, groupId, itemId),
      );
      toast.success("Quote item removed.");
    }
  };

  const handleSaveEditItem = () => {
    if (!customTitle.trim()) {
      toast.error("Enter a service name for the item.");
      return;
    }

    const nextQuantity = Number(customQuantity) || 0;
    const nextUnitPrice = Number(customUnitPrice) || 0;

    if (isEditMode && editItemId) {
      const currentGroup = workGroups.find((g) => g.id === editGroupId);
      const currentItem = currentGroup?.items.find((i) => i.id === editItemId);

      if (currentItem?.isCustom) {
        updateManagerQuote(editItemId, {
          title: customTitle,
          quantity: nextQuantity,
          unit: customMeasurementType,
          unitPrice: nextUnitPrice,
          isCustom: true,
        })
          .then((updatedQuote) => {
            setWorkGroups((current) =>
              updateQuoteWorkItemDetails(current, editGroupId, editItemId, {
                title: updatedQuote.title,
                quantity: String(updatedQuote.quantity),
                unit: updatedQuote.unit ?? "pcs",
                unitPrice: String(updatedQuote.unitPrice),
              }),
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
            setCustomItemModalVisible(false);
            setIsEditMode(false);
          })
          .catch(() => {
            toast.error("Unable to save the quote update right now.");
          });
      } else {
        // Catalog item edit - just update local state
        setWorkGroups((current) =>
          updateQuoteWorkItemDetails(current, editGroupId, editItemId, {
            title: customTitle,
            quantity: String(nextQuantity),
            unit: customMeasurementType,
            unitPrice: String(nextUnitPrice),
          }),
        );
        setCustomItemModalVisible(false);
        setIsEditMode(false);
      }
    }
  };

  return (
    <SafeAreaView edges={['top','left',"right"]} className="flex-1 bg-[#E9EDF1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={quoteFilterQuery.isRefetching}
            onRefresh={() => quoteFilterQuery.refetch()}
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

        <View className="mt-8 px-5">
          <View className="rounded-[20px] border border-[#D7E0E8] bg-white px-5 py-5 shadow-sm">
            <Text className="text-[18px] font-semibold text-[#1F2937]">
              Construction Quote Builder
            </Text>
            <View className="mt-5">
              <QuoteStepIndicator currentStep={step} totalSteps={3} />
            </View>
          </View>

          {step === 1 ? (
            <QuoteBuilderForm
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
              estimatedTime={estimatedTime}
              setEstimatedTime={setEstimatedTime}
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
              onNext={() => setStep(2)}
            />
          ) : step === 2 ? (
            <QuoteWorkItemsStep
              catalogTitle={quoteCatalogGroups.length ? "Work Item Categories" : "No Work Item Categories"}
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
                setWorkGroups((current) => toggleQuoteWorkGroup(current, groupId))
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
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          ) : (
            <QuoteFinalReviewStep
              clientName={clientName || defaultClientName}
              email={email || defaultEmail}
              projectAddress={projectAddress}
              projectType={projectType}
              propertyType={propertyType}
              unitType={unitType}
              estimatedTime={estimatedTime }
              workGroups={workGroups}
              subtotal={subtotal}
              itemsSelected={itemsSelected}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
              validUntilLabel={validUntilLabel}
              projectDetailsLabel={projectDetailsLabel}
              projectMetaLabel={projectMetaLabel}
              onEditSummary={() => setStep(1)}
              onEditWorkItems={() => setStep(2)}
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
      </ScrollView>

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
        visible={customItemModalVisible}
        title={customTitle}
        quantity={customQuantity}
        categoryId={customCategoryId}
        measurementType={customMeasurementType}
        unitPrice={customUnitPrice}
        categories={categoryOptions}
        measurementTypes={measurementOptions}
        workItemSuggestions={workItemSuggestions}
        onChangeTitle={setCustomTitle}
        onChangeQuantity={setCustomQuantity}
        onChangeCategoryId={setCustomCategoryId}
        onChangeMeasurementType={setCustomMeasurementType}
        onChangeUnitPrice={setCustomUnitPrice}
        onSelectWorkItem={(item) => {
          setCustomTitle(item.name);
          if (item.category?.id) {
            setCustomCategoryId(item.category.id);
          }
          if (item.measurementType) {
            setCustomMeasurementType(item.measurementType);
          }
          const nextUnitPrice = Number((item as any).unitCost ?? (item as any).unitPrice ?? 0);
          setCustomUnitPrice(String(nextUnitPrice));
        }}
        onClose={() => {
          setCustomItemModalVisible(false);
          setIsEditMode(false);
        }}
        onAdd={isEditMode ? handleSaveEditItem : handleAddCustomItem}
        isEditMode={isEditMode}
      />
    </SafeAreaView>
  );
}





















