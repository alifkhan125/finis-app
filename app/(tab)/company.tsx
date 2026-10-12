import BackTitleHeader from "@/components/common/BackTitleHeader";
import CompanyCard from "@/components/company/CompanyCard";
import { useCompaniesQuery, useDeleteCompanyMutation , useGenerateCompanyShareLinkMutation } from "@/hooks/company/company";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
 Share } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";



export default function Company() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading, isFetching, refetch } = useCompaniesQuery(
    page,
    limit,
  );
  const { deleteCompany, isPending: isDeleting } = useDeleteCompanyMutation();

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<{ id: string, name: string } | null>(null);

  const { generateLink, isPending: isGeneratingLink } = useGenerateCompanyShareLinkMutation();
  const [shareLink, setShareLink] = useState<string | null>(null);
  
  const handleGenerateShareLink = async () => {
    if (!selectedCompany) return;
    try {
      const { shareToken } = await generateLink(selectedCompany.id);
      const dashboardUrl = process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://dashboard.finis.com';
      setShareLink(`${dashboardUrl}/public/company/${shareToken}`);
    } catch (e) {}
  };
  
  const handleCopyLink = async () => {
    if (!shareLink) return;
    await Clipboard.setStringAsync(shareLink);
    Alert.alert("Link copied to clipboard!");
  };
  
  const handleShareLink = async () => {
    if (!shareLink) return;
    await Share.share({ message: shareLink, url: shareLink });
  };

  const handleMenuPress = (company: { id: string, name: string, isActive?: boolean }) => {
    if (company.isActive === false) {
      Alert.alert(
        "Company Suspended",
        "This company has been suspended by Super Admin. Actions are disabled.",
        [{ text: "OK" }]
      );
      return;
    }
    setSelectedCompany(company);
    setBottomSheetVisible(true);
  };

  const handleDeletePress = () => {
    if (!selectedCompany) return;
    setBottomSheetVisible(false);

    setTimeout(() => {
      Alert.alert(
        "Delete Company",
        `Are you sure you want to delete ${selectedCompany.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteCompany(selectedCompany.id);
              } catch (e) {
                // error handled in mutation
              }
            }
          }
        ]
      );
    }, 300);
  };

  const companies = data?.data ?? [];
  const meta = data?.meta;

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return companies;
    }

    return companies.filter((company) =>
      [company.name, company.industry, company.address, company.website]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [companies, search]);
  const refreshing = isFetching && !isLoading;

  return (
    <SafeAreaView edges={['top', 'left', "right"]} className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor="#1f3d5c"
              colors={["#1f3d5c"]}
            />
          }
        >
          <BackTitleHeader title="Company" onBack={() => router.back()} />

          <View className="mt-5 px-5">
            <View className="flex-row items-center rounded-xl border border-slate-200 bg-white px-3 py-2">
              <Ionicons name="search" size={16} color="#94a3b8" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search....."
                placeholderTextColor="#94a3b8"
                className="ml-2 flex-1 text-sm text-slate-700"
              />
            </View>
          </View>

          <View className="mt-2 px-5">
            {(isLoading || isFetching) && !filteredCompanies.length ? (
              <View className="mt-10 items-center">
                <ActivityIndicator size="small" color="#1f3d5c" />
                <Text className="mt-2 text-xs text-slate-500">
                  Loading companies...
                </Text>
              </View>
            ) : filteredCompanies.length ? (
              filteredCompanies.map((company) => (
                <CompanyCard
                  key={company.id}
                  name={company.name}
                  type={company.industry}
                  revenue={company.revenue?.toLocaleString()}
                  projectLevel={String(company._count.projects)}
                  address={company.address}
                  website={company.website}
                  logoUrl={company.logoUrl}
                  isActive={company.isActive}
                  onMenuPress={() => handleMenuPress(company)}
                  onPress={() => {
                    if (company.isActive === false) {
                      Alert.alert(
                        "Company Suspended",
                        "This company has been suspended by Super Admin. You cannot view details or manage projects for a suspended company.",
                        [{ text: "OK" }]
                      );
                      return;
                    }
                    router.push({
                      pathname: "/screens/company/profile",
                      params: { id: company.id },
                    });
                  }}
                />
              ))
            ) : (
              <View className="mt-10 items-center">
                <Text className="text-sm text-slate-500">
                  No companies found.
                </Text>
              </View>
            )}
          </View>

          <View className="mt-6 flex-row items-center justify-between px-5">
            <TouchableOpacity
              disabled={page === 1}
              onPress={() => setPage((current) => Math.max(1, current - 1))}
              className={`rounded-full px-4 py-2 ${page === 1 ? "bg-slate-200" : "bg-slate-900"
                }`}
              activeOpacity={0.85}
            >
              <Text
                className={`text-xs font-semibold ${page === 1 ? "text-slate-400" : "text-white"
                  }`}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <Text className="text-xs text-slate-500">
              Page {meta?.page ?? page}
            </Text>

            <TouchableOpacity
              disabled={meta ? page >= meta.totalPages : false}
              onPress={() => setPage((current) => current + 1)}
              className={`rounded-full px-4 py-2 ${meta && page >= meta.totalPages
                  ? "bg-slate-200"
                  : "bg-slate-900"
                }`}
              activeOpacity={0.85}
            >
              <Text
                className={`text-xs font-semibold ${meta && page >= meta.totalPages
                    ? "text-slate-400"
                    : "text-white"
                  }`}
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>

          <View className="mt-6 px-5">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/screens/company/createcompany")}
              className="items-center justify-center rounded-xl bg-[#1f3d5c] py-3"
            >
              <Text className="text-sm font-semibold text-white">
                Create New Company
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={bottomSheetVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setBottomSheetVisible(false); setShareLink(null); }}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
          activeOpacity={1}
          onPress={() => { setBottomSheetVisible(false); setShareLink(null); }}
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <TouchableOpacity activeOpacity={1}>
              <View
                className="rounded-t-3xl bg-white pt-5 px-5"
                style={{ paddingBottom: Math.max(insets.bottom, 32) }}
              >
                <View className="mb-5 items-center">
                  <View className="h-1 w-12 rounded-full bg-slate-300" />
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleDeletePress}
                  className="flex-row items-center rounded-xl p-4 bg-red-50 mb-4"
                >
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  <Text className="ml-3 text-base font-medium text-red-500">
                    Delete Company
                  </Text>
                </TouchableOpacity>

                {shareLink ? (
                  <View className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <Text className="text-sm text-slate-500 mb-2">Public Link:</Text>
                    <Text className="text-base text-slate-800 mb-4">{shareLink}</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity activeOpacity={0.7} onPress={handleCopyLink} className="flex-1 flex-row items-center justify-center rounded-xl p-3 bg-[#1f3d5c]">
                        <Ionicons name="copy-outline" size={20} color="#ffffff" />
                        <Text className="ml-2 text-sm font-medium text-white">Copy Link</Text>
                      </TouchableOpacity>
                      <TouchableOpacity activeOpacity={0.7} onPress={handleShareLink} className="flex-row items-center justify-center rounded-xl p-3 bg-slate-200">
                        <Ionicons name="share-social-outline" size={20} color="#0f172a" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity activeOpacity={0.7} onPress={handleGenerateShareLink} className="flex-row items-center rounded-xl p-4 bg-blue-50 mb-4">
                    <Ionicons name="link-outline" size={24} color="#3b82f6" />
                    <Text className="ml-3 text-base font-medium text-blue-500">
                      {isGeneratingLink ? "Generating..." : "Generate Public Link"}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => { setBottomSheetVisible(false); setShareLink(null); }}
                  className="flex-row items-center justify-center rounded-xl p-4 bg-slate-100"
                >
                  <Text className="text-base font-medium text-slate-700">
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
