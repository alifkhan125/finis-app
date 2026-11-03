import React from "react";
import { KeyboardTypeOptions, Text, TextInput, View } from "react-native";

type InventoryFormFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
};

export default function InventoryFormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: InventoryFormFieldProps) {
  return (
    <View className="mt-[18px]">
      <Text className="mb-3 text-[16px] font-semibold text-[#2B2B2B]">
        {label}
      </Text>
      <View className="h-[50px] justify-center rounded-[12px] border border-[#C6CED8] bg-[#EAF1F4] px-5">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8B949C"
          keyboardType={keyboardType}
          numberOfLines={1}
          className="text-[18px] text-[#545C64]"
        />
      </View>
    </View>
  );
}
