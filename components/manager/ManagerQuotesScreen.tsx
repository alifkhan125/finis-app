import React, { useMemo, useState , useEffect } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createManagerQuote,
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
import { useCompaniesQuery } from "@/hooks/company/company";
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
  const [companyId, setCompanyId] = useState("");
  const [companySheetVisible, setCompanySheetVisible] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [floorsCount, setFloorsCount] = useState("");
  const [unitsPerFloor, setUnitsPerFloor] = useState("");
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
  const companiesQuery = useCompaniesQuery(1, 100);
  const companies = companiesQuery.data?.data ?? [];
  const selectedCompany = companies.find((company) => company.id === companyId);
  const companyName = selectedCompany?.name ?? "";
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
        subject: projectName || projectAddress || `${projectType} Project`,
        body: `Welcome ${clientName || defaultClientName || ""},

Company: ${companyName || "N/A"}
Project Name: ${projectName || "N/A"}
Client Name: ${clientName || defaultClientName || ""}
Client Email: ${resolvedEmail}
Phone Number: ${phoneNumber || defaultPhone || "N/A"}
Project Address: ${projectAddress || "N/A"}
Project Type: ${projectType}
Property Type: ${propertyType}
Unit Type: ${unitType}
Start Date: ${startDate || "N/A"}
End Date: ${endDate || "N/A"}
Floors Count: ${floorsCount || "N/A"}
Units Per Floor: ${unitsPerFloor || "N/A"}
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
              defaultClientName={defaultClientName}
              defaultPhone={defaultPhone}
              defaultEmail={defaultEmail}
              estimatedTime={estimatedTime}
              setEstimatedTime={setEstimatedTime}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              floorsCount={floorsCount}
              setFloorsCount={setFloorsCount}
              unitsPerFloor={unitsPerFloor}
              setUnitsPerFloor={setUnitsPerFloor}
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
              companyName={companyName}
              projectName={projectName}
              email={email || defaultEmail}
              phoneNumber={phoneNumber || defaultPhone}
              projectAddress={projectAddress}
              projectType={projectType}
              propertyType={propertyType}
              unitType={unitType}
              estimatedTime={estimatedTime }
              startDate={startDate}
              endDate={endDate}
              floorsCount={floorsCount}
              unitsPerFloor={unitsPerFloor}
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

      <Modal
        transparent
        visible={companySheetVisible}
        animationType="slide"
        onRequestClose={() => setCompanySheetVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/35"
          onPress={() => setCompanySheetVisible(false)}
        >
          <Pressable className="max-h-[75%] rounded-t-[26px] bg-white px-5 pb-8 pt-4">
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-[#CBD5E1]" />
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-[18px] font-semibold text-[#1F2937]">
                  Select Company
                </Text>
                <Text className="mt-1 text-[13px] text-[#64748B]">
                  Choose from saved companies.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCompanySheetVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F1F5F9]"
              >
                <Text className="text-[18px] font-semibold text-[#334155]">x</Text>
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
                  Create a company first, then select it here.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
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
                      className={`mb-3 rounded-[16px] border px-4 py-4 ${
                        isSelected
                          ? "border-[#1F5577] bg-[#EAF4FA]"
                          : "border-[#E2E8F0] bg-white"
                      }`}
                    >
                      <Text
                        className={`text-[15px] font-semibold ${
                          isSelected ? "text-[#1F5577]" : "text-[#1F2937]"
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





















