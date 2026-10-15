import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { KeyboardTypeOptions, Text, TextInput, TouchableOpacity, View } from "react-native";

type QuoteFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPressRightIcon?: () => void;
  onPress?: () => void;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
};

export default function QuoteField({
  label,
  placeholder,
  value,
  onChangeText,
  leftIcon,
  rightIcon,
  onPressRightIcon,
  onPress,
  keyboardType,
  editable = true,
}: QuoteFieldProps) {
  const isPressable = typeof onPress === "function";

  const fieldContent = (
    <View className="h-[56px] flex-row items-center rounded-[16px] border border-[#D4DCE5] bg-white px-4">
      {leftIcon ? (
        <Ionicons name={leftIcon} size={22} color="#A0A8B5" />
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0A8B5"
        keyboardType={keyboardType}
        editable={isPressable ? false : editable}
        pointerEvents={isPressable ? "none" : "auto"}
        className={`flex-1 text-[14px] text-[#1F2937] ${leftIcon ? "ml-3" : ""}`}
      />
      {rightIcon ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPressRightIcon || onPress}>
          <Ionicons name={rightIcon} size={22} color="#1F5577" />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View className="mb-5">
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className="mb-2 text-[12px] font-medium text-[#2B2B2B]"
      >
        {label}
      </Text>
      {isPressable ? (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
          {fieldContent}
        </TouchableOpacity>
      ) : (
        fieldContent
      )}
    </View>
  );
}
