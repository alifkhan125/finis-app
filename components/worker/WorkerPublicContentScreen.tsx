import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePublicContentPageQuery } from "@/hooks/public-content/public-content";
import RichDocument from "@/components/common/RichDocument";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  colors: {
    background: "#FFFFFF",
    textMain: "#1A1C1E",
    textSecondary: "#475569",
    border: "#F1F5F9",
    accent: "#1D4F6D",
  },
};

type SectionItem = {
  title: string;
  content: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

function htmlToPlainText(value: string) {
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
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.includes("<") ? htmlToPlainText(value) : value.trim();
}

function getObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseSections(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = normalizeText(row.title || row.heading || row.question);
      const content = normalizeText(
        row.content || row.body || row.text || row.answer,
      );
      return title || content ? { title, content } : null;
    })
    .filter((item): item is SectionItem => Boolean(item));
}

function parseFaqs(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = normalizeText(row.question || row.title || row.heading);
      const answer = normalizeText(row.answer || row.content || row.body);
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is FaqItem => Boolean(item));
}

function extractIntro(data?: {
  subtitle?: string | null;
  body?: unknown;
}) {
  return normalizeText(data?.subtitle);
}

function extractBody(data?: { body?: unknown }) {
  const bodyObject = getObject(data?.body);

  return (
    (typeof data?.body === "string" ? data.body.trim() : "") ||
    (typeof bodyObject?.content === "string" ? bodyObject.content.trim() : "") ||
    (typeof bodyObject?.description === "string" ? bodyObject.description.trim() : "") ||
    (typeof bodyObject?.text === "string" ? bodyObject.text.trim() : "") ||
    ""
  );
}

function extractSections(data?: { body?: unknown; sections?: unknown }) {
  const directSections = parseSections(data?.sections);
  if (directSections.length > 0) return directSections;

  const bodyObject = getObject(data?.body);

  return (
    parseSections(bodyObject?.sections) ||
    parseSections(bodyObject?.items) ||
    parseSections(bodyObject?.content)
  );
}

function extractFaqs(data?: { body?: unknown; sections?: unknown }) {
  const directFaqs = parseFaqs(data?.sections);
  if (directFaqs.length > 0) return directFaqs;

  const bodyObject = getObject(data?.body);

  return (
    parseFaqs(bodyObject?.faqs) ||
    parseFaqs(bodyObject?.questions) ||
    parseFaqs(bodyObject?.items) ||
    parseFaqs(bodyObject?.sections)
  );
}

function Section({ title, content, number }: SectionItem & { number: number }) {
  return (
    <View style={{ marginBottom: 14, flexDirection: "row", borderWidth: 1, borderColor: "#E5EAEE", borderRadius: 18, backgroundColor: "#F8FAFB", padding: 16 }}>
      <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: THEME.colors.accent, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>{number}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        {title ? <Text style={{ fontSize: 16, fontWeight: "700", color: THEME.colors.textMain, marginBottom: 8 }}>{title}</Text> : null}
        <Text style={{ fontSize: 14, lineHeight: 22, color: THEME.colors.textSecondary }}>{content}</Text>
      </View>
    </View>
  );
}

function FAQItem({
  number,
  question,
  answer,
  isExpanded,
  onPress,
}: FaqItem & {
  number: number;
  isExpanded: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={{ borderBottomWidth: 1, borderBottomColor: THEME.colors.border }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 24,
        }}
      >
        <Text
          style={{ fontSize: 16, color: "#475569", fontWeight: "500", width: 24 }}
        >
          {number}.
        </Text>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            color: THEME.colors.accent,
            fontWeight: "600",
            marginLeft: 4,
          }}
        >
          {question}
        </Text>
        <Feather
          name={isExpanded ? "chevron-down" : "chevron-right"}
          size={20}
          color="#94A3B8"
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>

      {isExpanded ? (
        <View style={{ paddingBottom: 24, paddingLeft: 28 }}>
          <Text style={{ fontSize: 14, color: "#64748B", lineHeight: 22 }}>
            {answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type WorkerPublicContentScreenProps = {
  screenTitle: string;
  slug: string;
  fallbackIntro?: string;
  fallbackSections?: SectionItem[];
  fallbackFaqs?: FaqItem[];
  variant?: "article" | "faq";
};

export default function WorkerPublicContentScreen({
  screenTitle,
  slug,
  fallbackIntro = "",
  fallbackSections = [],
  fallbackFaqs = [],
  variant = "article",
}: WorkerPublicContentScreenProps) {
  const { data, isLoading, isError, isRefetching, refetch } =
    usePublicContentPageQuery(slug);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const apiIntro = extractIntro(data);
  const apiBody = extractBody(data);
  const apiSections = extractSections(data);
  const apiFaqs = extractFaqs(data);
  const intro = apiIntro || fallbackIntro;
  const body = apiBody;
  const isLegalDocument = slug === "privacy-policy" || slug === "terms-and-conditions";
  const sections = isLegalDocument ? [] : apiSections.length > 0 ? apiSections : fallbackSections;
  const faqs = apiFaqs.length > 0 ? apiFaqs : fallbackFaqs;
  const resolvedTitle = data?.title?.trim() || screenTitle;

  const toggleExpand = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: THEME.colors.background }}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="dark-content" />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: 64,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: "absolute", left: 20 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather
            name="chevron-left"
            size={32}
            color={THEME.colors.textMain}
          />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: THEME.colors.textMain,
          }}
        >
          {resolvedTitle}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={THEME.colors.accent} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
              }}
              tintColor={THEME.colors.accent}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 40,
          }}
        >
          {variant === "faq" ? (
            faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <FAQItem
                  key={`${faq.question}-${index}`}
                  number={index + 1}
                  question={faq.question}
                  answer={faq.answer}
                  isExpanded={expandedIndex === index}
                  onPress={() => toggleExpand(index)}
                />
              ))
            ) : isError ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <Feather name="wifi-off" size={32} color="#94A3B8" />
                <Text style={{ marginTop: 14, fontSize: 15, fontWeight: "600", color: THEME.colors.textMain }}>Unable to load this page</Text>
                <Text style={{ marginTop: 6, textAlign: "center", fontSize: 13, lineHeight: 20, color: THEME.colors.textSecondary }}>Check your connection and try again. This page is loaded from the Finis server.</Text>
                <TouchableOpacity onPress={() => void refetch()} style={{ marginTop: 18, borderRadius: 12, backgroundColor: THEME.colors.accent, paddingHorizontal: 20, paddingVertical: 11 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>No FAQ content is currently published.</Text>
            )
          ) : (
            <>
              {intro ? (
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: THEME.colors.textSecondary,
                    marginBottom: 24,
                    textAlign: "justify",
                  }}
                >
                  {intro}
                </Text>
              ) : null}

              {body ? <View style={{ marginBottom: sections.length > 0 ? 24 : 0 }}><RichDocument html={body} /></View> : null}

              {sections.length > 0 ? (
                sections.map((section, index) => (
                  <Section
                    key={`${section.title}-${index}`}
                    number={index + 1}
                    title={section.title}
                    content={section.content}
                  />
                ))
              ) : isError ? (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <Feather name="wifi-off" size={32} color="#94A3B8" />
                  <Text style={{ marginTop: 14, fontSize: 15, fontWeight: "600", color: THEME.colors.textMain }}>Unable to load this page</Text>
                  <Text style={{ marginTop: 6, textAlign: "center", fontSize: 13, lineHeight: 20, color: THEME.colors.textSecondary }}>Check your connection and try again. This page is loaded from the Finis server.</Text>
                  <TouchableOpacity onPress={() => void refetch()} style={{ marginTop: 18, borderRadius: 12, backgroundColor: THEME.colors.accent, paddingHorizontal: 20, paddingVertical: 11 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>No content is currently published.</Text>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
