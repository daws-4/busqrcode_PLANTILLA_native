import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-white pt-4 px-2">
    {children}
    <StatusBar style='dark' /></View>;
}
