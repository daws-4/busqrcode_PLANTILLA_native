import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useTheme } from '@/app/contexts/ThemeContext';
import useThemeColors from '@/app/contexts/ThemeColors';

export default function useThemedNavigation() {
  const { isDark } = useTheme();
  const colors = useThemeColors();


  useEffect(() => {
    if (Platform.OS === 'android') {
      // NavigationBar.setBackgroundColorAsync(colors.bg); // Not supported with edge-to-edge
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');

    }
  }, [isDark, colors.bg]);
  const ThemedStatusBar = () => (
    <StatusBar
      style={isDark ? 'light' : 'dark'}
      backgroundColor="transparent"
      translucent={true}
    />
  );

  const screenOptions = {
    headerShown: false,
    backgroundColor: colors.bg,
    contentStyle: {
      backgroundColor: colors.bg
    }
  };

  return {
    ThemedStatusBar,
    screenOptions,
    colors,
    isDark
  };
} 