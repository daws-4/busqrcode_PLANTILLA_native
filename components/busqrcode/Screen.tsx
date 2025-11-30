import { View, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";

export function Screen({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-light-primary pt-4 px-2">
    <ScrollView>
    {children}
    </ScrollView>
    <StatusBar style='light' /></View>;
}
