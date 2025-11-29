import { Slot, useSegments, useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { UserProvider, useUserContext, useIsLoadingContext } from "../lib/AuthProvider";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

export const unstable_settings = {
  initialRouteName: '(app)',
};

function InitialLayout() {
  const user = useUserContext();
  const isLoading = useIsLoadingContext();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(app)';

    if (!user && !inAuthGroup) {
      // Redirect to the login page if not authenticated and not already in the auth group
      router.replace('/');
    } else if (user && inAuthGroup) {
      // Redirect to the main app if authenticated and trying to access the login page
      router.replace('/scaner');
    }
  }, [user, segments, isLoading]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
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
