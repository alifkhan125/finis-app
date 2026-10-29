import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { usePublicContentPageQuery } from "@/hooks/public-content/public-content";
import RichDocument from "@/components/common/RichDocument";

type Props = {
  slug: "privacy-policy" | "terms-and-conditions";
  fallbackTitle: string;
  nextRoute: "/screens/auth/faq" | "/screens/auth/welcome";
};

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_list, items: string) =>
      items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_item, content: string, offset: number, source: string) => {
        const position = source.slice(0, offset).match(/<li\b/gi)?.length ?? 0;
        return `${position + 1}. ${content}\n`;
      }),
    )
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_list, items: string) => items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "• $1\n"))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.includes("<") ? htmlToText(value) : value.trim();
}

export default function OnboardingLegalScreen({ slug, fallbackTitle, nextRoute }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const { data, isLoading, isError, isRefetching, refetch } = usePublicContentPageQuery(slug);
  const title = data?.title?.trim() || fallbackTitle;
  const subtitle = normalizeText(data?.subtitle);
  const body = typeof data?.body === "string" ? data.body.trim() : "";
  const hasContent = Boolean(subtitle || body);

  const handleNext = () => {
    if (!hasContent) return toast.error("Please load the latest content before continuing.");
    if (!accepted) return toast.error(`Please accept the ${title} to continue.`);
    router.push(nextRoute);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#E9EDF1]" edges={["top", "left", "right", "bottom"]}>
      <View className="flex-1 px-4 py-4">
        <View className="flex-1 overflow-hidden rounded-[28px] border border-[#DDE3E8] bg-white shadow-sm">
          <View className="flex-row items-center border-b border-[#E8ECEF] px-5 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EAF1F5]">
              <Ionicons name={slug === "privacy-policy" ? "shield-checkmark-outline" : "document-text-outline"} size={21} color="#1F5577" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[20px] font-bold text-[#1F2328]">{title}</Text>
              <Text className="mt-0.5 text-[12px] text-[#6D737A]">Please read before continuing</Text>
            </View>
          </View>

          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#1F5577" />
              <Text className="mt-3 text-[13px] text-[#6D737A]">Loading latest content...</Text>
            </View>
          ) : isError || !hasContent ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="cloud-offline-outline" size={38} color="#98A1AA" />
              <Text className="mt-4 text-[17px] font-semibold text-[#252A30]">Unable to load content</Text>
              <Text className="mt-2 text-center text-[13px] leading-5 text-[#6D737A]">This page is loaded from the Finis server. Check your connection and try again.</Text>
              <TouchableOpacity onPress={() => void refetch()} className="mt-5 rounded-xl bg-[#1F5577] px-6 py-3">
                <Text className="font-semibold text-white">Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor="#1F5577" />}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: Math.max(24, insets.bottom + 16),
              }}
            >
              {subtitle ? <Text className="mb-4 text-[15px] font-medium leading-6 text-[#3E454C]">{subtitle}</Text> : null}
              {body ? <View className="mb-5"><RichDocument html={body} /></View> : null}
              <Pressable
                className="mt-2 flex-row items-start rounded-2xl border border-[#D9E2E8] bg-[#F8FAFB] p-4"
                onPress={() => setAccepted((value) => !value)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: accepted }}
              >
                <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${accepted ? "border-[#1F5577] bg-[#1F5577]" : "border-[#9AA4AD] bg-white"}`}>
                  {accepted ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                </View>
                <Text className="ml-3 flex-1 text-[13px] leading-5 text-[#3E454C]">I have read and agree to the {title}.</Text>
              </Pressable>
              <TouchableOpacity className={`mt-5 h-14 items-center justify-center rounded-xl ${accepted ? "bg-[#1F5577]" : "bg-[#C5CDD3]"}`} onPress={handleNext} activeOpacity={0.85}>
                <Text className="text-[16px] font-semibold text-white">Accept &amp; Continue</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
