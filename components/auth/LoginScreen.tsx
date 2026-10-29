import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { getRoleHomeRoute } from "@/api/auth/auth.routes";
import { useLogin } from "@/hooks/auth/auth";

const REMEMBERED_IDENTIFIER_KEY = "finis-remembered-identifier";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isPending } = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRememberedIdentifier = async () => {
      const storedIdentifier = await AsyncStorage.getItem(
        REMEMBERED_IDENTIFIER_KEY,
      );

      if (!isMounted || !storedIdentifier) {
        return;
      }

      setIdentifier(storedIdentifier);
      setRememberMe(true);
    };

    loadRememberedIdentifier();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async () => {
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier || !password) {
      toast.error("Enter your email or phone and password.");
      return;
    }

    try {
      const session = await login({
        identifier: trimmedIdentifier,
        password,
      });

      if (rememberMe) {
        await AsyncStorage.setItem(
          REMEMBERED_IDENTIFIER_KEY,
          trimmedIdentifier,
        );
      } else {
        await AsyncStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
      }

      toast.success("Login successful");
      router.replace(getRoleHomeRoute(session.user.role));
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data?.message as string | undefined)
        : undefined;
      toast.error(
        message ||
          (error instanceof Error ? error.message : "Unable to sign in."),
      );
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', "right"]} className="flex-1 bg-[#E9EDF1]">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="h-16 flex-row items-center border-b border-[#DBE0E5] px-5">
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#1E2329" />
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-16">
            <Text className="text-[38px] font-semibold text-[#1F2328]">
              Welcome Back
            </Text>
            <Text className="mt-1 text-[22px] text-[#4E545B]">
              Login to your account
            </Text>

            <Text className="mt-12 text-[16px] text-[#34393F]">
              Enter Your E-mail Or Number
            </Text>
            <TextInput
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="E-mail address or number"
              placeholderTextColor="#90979F"
              autoCapitalize="none"
              keyboardType="email-address"
              className="mt-3 h-14 rounded-xl border border-[#C8CED5] bg-[#F3F4F6] px-4 text-[16px] text-[#1E2328]"
            />

            <Text className="mt-5 text-[16px] text-[#34393F]">Password</Text>
            <View className="mt-3 h-14 flex-row items-center rounded-xl border border-[#C8CED5] bg-[#F3F4F6] px-3">
              <Ionicons name="lock-closed-outline" size={18} color="#9BA2AA" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                placeholderTextColor="#90979F"
                secureTextEntry={!showPassword}
                className="ml-2 flex-1 text-[16px] text-[#1E2328]"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((current) => !current)}
                activeOpacity={0.75}
                className="ml-2 h-8 w-8 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#9BA2AA"
                />
              </TouchableOpacity>
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setRememberMe((current) => !current)}
                activeOpacity={0.8}
                className="flex-row items-center"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View
                  className={`h-4 w-4 items-center justify-center rounded-full border ${
                    rememberMe ? "border-[#1F5577] bg-[#1F5577]" : "border-[#B7BDC4]"
                  }`}
                >
                  {rememberMe ? (
                    <View className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                </View>
                <Text className="ml-2 text-[14px] text-[#6D737A]">
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                activeOpacity={0.75}
              >
                <Text className="text-[14px] font-medium text-[#FF7A7A]">
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="mt-6 h-12 items-center justify-center rounded-xl bg-[#1F5577]"
              onPress={handleLogin}
              activeOpacity={0.86}
              disabled={isPending}
            >
              <Text className="text-[18px] font-semibold text-white">
                {isPending ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>

            <View className="mt-8 items-center border-t border-[#D5DAE0] pt-5">
              <View className="mb-2 flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={15} color="#64707C" />
                <Text className="ml-1.5 text-[12px] text-[#64707C]">
                  Your account and data are protected
                </Text>
              </View>
              <Text className="text-center text-[12px] leading-5 text-[#747B83]">
                By continuing, you acknowledge our
              </Text>
              <View className="mt-1 flex-row items-center justify-center">
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/privacy-policy")}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="Open Privacy Policy"
                >
                  <Text className="text-[13px] font-semibold text-[#1F5577] underline">
                    Privacy Policy
                  </Text>
                </TouchableOpacity>
                <Text className="mx-2 text-[12px] text-[#9AA1A8]">•</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/terms-and-conditions")}
                  activeOpacity={0.7}
                  accessibilityRole="link"
                  accessibilityLabel="Open Terms and Conditions"
                >
                  <Text className="text-[13px] font-semibold text-[#1F5577] underline">
                    Terms &amp; Conditions
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
