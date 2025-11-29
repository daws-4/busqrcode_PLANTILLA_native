import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
import { NativeWindStyleSheet } from 'nativewind';
import { ThemeProvider } from './contexts/ThemeContext';
import useThemedNavigation from './hooks/useThemedNavigation';
import { useFonts, Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';


import { useSafeAreaInsets } from 'react-native-safe-area-context';

NativeWindStyleSheet.setOutput({
  default: 'native',
});

function ThemedLayout() {
  const { ThemedStatusBar, screenOptions } = useThemedNavigation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{
        ...screenOptions,
        contentStyle: {
          ...screenOptions.contentStyle,
          paddingBottom: insets.bottom
        }
      }} />

    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular: Lora_400Regular,
    Lora_700Bold: Lora_700Bold,
  });
  return (

    <ThemeProvider>
      <ThemedLayout />
    </ThemeProvider>

  );
}
