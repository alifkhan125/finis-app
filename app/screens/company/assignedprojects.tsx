import BackTitleHeader from "@/components/common/BackTitleHeader";
import AssignedProjectCard from "@/components/company/assignedprojects/AssignedProjectCard";
import { useCompanyProjectsQuery, useDeleteProjectMutation , useGenerateProjectShareLinkMutation } from "@/hooks/company/company";
import type { CompanyProjectTeamMember } from "@/types/company.types";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
 Share } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";


import { Ionicons } from "@expo/vector-icons";
import { usePullToRefresh } from "@/hooks/common/usePullToRefresh";

function resolveAvatarUrl(avatarUrl: string | null) {
  return avatarUrl;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPriority(value?: string): "MEDIUM" | "HIGH" | "LOW" {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "high" || normalized === "active") return "HIGH";
  if (
    normalized === "medium" ||
    normalized === "meduim" ||
    normalized === "pending"
  )
    return "MEDIUM";
  if (normalized === "low") return "LOW";
  return "LOW";
}

export default function AssignedProjectsRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const companyId = typeof id === "string" ? id : undefined;
  const { data, isLoading, error } = useCompanyProjectsQuery(companyId);
  const { deleteProject } = useDeleteProjectMutation();
  const { refreshing, onRefresh } = usePullToRefresh();
  const insets = useSafeAreaInsets();

  const isSuspended =
    (error as any)?.response?.status === 403 ||
    (error as any)?.statusCode === 403 ||
    (error instanceof Error && error.message.toLowerCase().includes("suspended"));

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null);

  const { generateLink, isPending: isGeneratingLink } = useGenerateProjectShareLinkMutation();
  const [shareLink, setShareLink] = useState<string | null>(null);
  
  const handleGenerateShareLink = async () => {
    if (!selectedProject) return;
    try {
      const { shareToken } = await generateLink(selectedProject.id);
      const dashboardUrl = process.env.EXPO_PUBLIC_DASHBOARD_URL || 'https://dashboard.finis.com';
      setShareLink(`${dashboardUrl}/public/project/${shareToken}`);
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

  const handleMenuPress = (project: { id: string; name: string }) => {
    setSelectedProject(project);
    setBottomSheetVisible(true);
  };

  const handleDeletePress = () => {
    if (!selectedProject) return;
    setBottomSheetVisible(false);

    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete ${selectedProject.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProject(selectedProject.id),
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', "right"]} className="flex-1 bg-[#e9edf1]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1f3d5c"
            colors={["#1f3d5c"]}
          />
        }
      >
        <BackTitleHeader
          title="Assigned Projects"
          onBack={() => router.back()}
        />

        {isSuspended ? (
          <View className="mx-5 my-10 items-center justify-center rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <Ionicons name="lock-closed" size={32} color="#dc2626" />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center">
              Company Suspended
            </Text>
            <Text className="mt-2 px-2 text-center text-sm text-slate-600 leading-5">
              This company has been suspended by Super Admin. Project management and creation are disabled.
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.back()}
              className="mt-6 rounded-xl bg-[#1D4F6D] px-6 py-3"
            >
              <Text className="font-semibold text-white">Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View className="mt-10 items-center">
            <ActivityIndicator size="small" color="#1d4f6d" />
            <Text className="mt-2 text-xs text-slate-500">
              Loading projects...
            </Text>
          </View>
        ) : Array.isArray(data) && data.length > 0 ? (
          <View className="mt-6 px-5">
            {data.map((project) => {
              const avatars = project.teamMembers
                .map((member: CompanyProjectTeamMember) =>
                  resolveAvatarUrl(member.user.avatarUrl),
                );
              const totalMembers = project._count.teamMembers;
              const extraMembersCount = Math.max(totalMembers - 3, 0);

              return (
                <AssignedProjectCard
                  key={project.id}
                  priority={getPriority(project.priority ?? project.status)}
                  title={project.name}
                  site={project.location}
                  date={formatDate(project.startDate)}
                  checklist={`0/${project._count.tasks}`}
                  links={String(project._count.tasks)}
                  extraMembers={
                    extraMembersCount > 0 ? `${extraMembersCount}+` : ""
                  }
                  avatars={avatars}
                  onPress={() =>
                    router.push({
                      pathname: "/screens/company/projectdetails",
                      params: { id: project.id },
                    })
                  }
                  onMenuPress={() => handleMenuPress({ id: project.id, name: project.name })}
                />
              );
            })}
          </View>
        ) : (
          <View className="mt-10 items-center px-5">
            <Text className="text-sm text-slate-500">No projects found.</Text>
          </View>
        )}

        {!isSuspended && (
          <View className="mt-7 px-5">
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() =>
                companyId
                  ? router.push({
                    pathname: "/screens/company/createproject",
                    params: { id: companyId },
                  })
                  : router.push("/screens/company/createproject")
              }
              className="h-[52px] w-full flex-row items-center justify-center gap-2 rounded-[12px] bg-[#1D4F6D] px-8 py-3"
              style={styles.buttonChrome}
            >
              <Text className="text-center text-[16px] font-medium leading-6 text-[#EAEFE9]">
                Create Project & Setup Floors
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
                style={{ paddingBottom: 32 }}
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
                    Delete Project
                  </Text>
                </TouchableOpacity>

                {shareLink ? (
                  <View className="mb-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <Text className="text-sm text-slate-500 mb-2">Public Link:</Text>
                    <Text className="text-base text-slate-800 mb-4">{shareLink}</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity activeOpacity={0.7} onPress={handleCopyLink} className="flex-1 flex-row items-center justify-center rounded-xl p-3 bg-[#1D4F6D]">
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

const styles = StyleSheet.create({
  buttonChrome: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "#1D4F6D",
  },
});
