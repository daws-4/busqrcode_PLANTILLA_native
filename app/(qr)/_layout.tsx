import { View } from "react-native";
import { Stack, Link } from "expo-router";
import { Pressable } from "react-native";
import { CircleInfoIcon } from "../../components/busqrcode/Icons";
import { Logo } from "../../components/busqrcode/Logo";
import { StatusBar } from "expo-status-bar";

export default function qrLayout() {
  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          header: () => (
            <View className="bg-white px-4 pt-12 pb-2 flex flex-row justify-between items-center border-b-2 border-stone-600">
              <Logo />
              <Link asChild href="/about">
                <Pressable>
                  <CircleInfoIcon />
                </Pressable>
              </Link>
            </View>
          ),
          headerShown: true,
        }}
      />
      <StatusBar style="dark" />
    </View>
  );
}