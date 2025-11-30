import { Slot, useSegments, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { UserProvider, useUserContext, useIsLoadingContext } from "../lib/AuthProvider";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";

export const unstable_settings = {
  initialRouteName: '(app)',
};

function InitialLayout() {
  const user = useUserContext();
  const isLoading = useIsLoadingContext();
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(app)';

    if (!user) {
      if (!inAuthGroup) {
        router.replace('/');
      }
    } else {
      if (inAuthGroup || !hasNavigated.current) {
        hasNavigated.current = true;
        router.replace('/scaner');
      }
    }
  }, [user, segments, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-light-primary">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Slot />
      <StatusBar style="dark" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <UserProvider>
      <InitialLayout />
    </UserProvider>
  );
}
