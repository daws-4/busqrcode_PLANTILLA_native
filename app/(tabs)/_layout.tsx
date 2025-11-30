import { Tabs, Link, Stack, Redirect } from "expo-router";
import { Pressable, Text } from "react-native";
import { CircleInfoIcon } from "../../components/busqrcode/Icons";
import { Logo } from "../../components/busqrcode/Logo";
import { ScannerIcon, InfoIcon } from "../../components/busqrcode/Icons";
import { useEffect } from "react";
import { check } from "prettier";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  ConnectionStateContext,
  ConnectionStateToggleContext,
} from "../../lib/AuthProvider";

export default function TabsLayout() {
  const connection = ConnectionStateContext();
  const setConnection = ConnectionStateToggleContext();
  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          header: () => (
            <View className="bg-white px-4 pt-12 pb-2 flex flex-row justify-between items-center border-b-2 border-stone-600 bg-light-primary">
              <Logo />
              {connection ?
                <Text className='text-green-500'>conectado</Text> :
                <Text className='text-slate-500'>Desconectado</Text>

              }
              <Link asChild href="/about">
                <Pressable>
                  <CircleInfoIcon color="#acaba8ff"/>
                </Pressable>
              </Link>
            </View>
          ),
          headerShown: true,
          tabBarStyle: { backgroundColor: "#1E303E" },
          tabBarActiveTintColor: "#49B3A0",
        }}
      >
        <Tabs.Screen
          name="scaner"
          options={{
            title: "Escáner",
            tabBarIcon: ({ color }) => <ScannerIcon color={color} />,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            title: "Guía",
            tabBarIcon: ({ color }) => <InfoIcon color={color} />,
          }}
        />
      </Tabs>
      <StatusBar style="dark" />
    </View>
  );
}
