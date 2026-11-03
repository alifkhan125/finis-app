import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { toast } from "sonner-native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWorkerSupportRequestMutation } from "@/hooks/public-content/public-content";

const THEME = {
  colors: {
    background: "#FFFFFF",
    white: "#FFFFFF",
    textMain: "#1A1C1E",
    textSecondary: "#475569",
    inputBg: "#F8FAFC",
    inputBorder: "#F1F5F9",
    bluePrimary: "#1D4F6D",
  },
};

export default function SupportRequestsScreen() {
  const [complain, setComplain] = useState("");
  const supportMutation = useWorkerSupportRequestMutation();

  const handleSubmit = async () => {
    if (!complain.trim()) {
      toast.error("Please write your support request");
      return;
    }

    try {
      await supportMutation.mutateAsync({
        // Keep the legacy request field for backward compatibility. The
        // backend always routes this request to the active super_admin.
        sendTo: "admin",
        message: complain.trim(),
      });
      router.back();
    } catch {
      // handled in mutation
    }
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
          <Feather name="chevron-left" size={32} color={THEME.colors.textMain} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: THEME.colors.textMain,
          }}
        >
          Support Requests
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 32,
            paddingBottom: 40,
          }}
        >
          <View
            style={{
              marginBottom: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              backgroundColor: "#F3F9FB",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontSize: 13, color: "#64748B" }}>Your request will be sent to Finis Support.</Text>
            <Text style={{ marginTop: 4, fontSize: 15, color: "#1D4F6D", fontWeight: "700" }}>Super Admin Support</Text>
          </View>

          <View
            style={{
              height: 200,
              backgroundColor: "#F3F9FB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              marginBottom: 24,
            }}
          >
            <TextInput
              placeholder="Write your complain here"
              placeholderTextColor="#CBD5E1"
              multiline
              textAlignVertical="top"
              value={complain}
              onChangeText={setComplain}
              style={{
                flex: 1,
                fontSize: 16,
                color: THEME.colors.textMain,
                fontWeight: "500",
              }}
            />
          </View>

          <TouchableOpacity
            style={{
              height: 56,
              backgroundColor: THEME.colors.bluePrimary,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              opacity: supportMutation.isPending ? 0.7 : 1,
            }}
            disabled={supportMutation.isPending}
            onPress={handleSubmit}
          >
            {supportMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
