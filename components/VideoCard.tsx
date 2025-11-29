import { View, Pressable, Text, Animated, Easing } from "react-native";
import { useState, useRef, useEffect } from "react";
import { useVideoPlayer, VideoView } from 'expo-video';
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import Feather from '@expo/vector-icons/Feather';
import { BlurView } from "expo-blur";

interface VideoCardProps {
    videoUrl: string;
    title: string;
    description: string;
    duration: string;
    onPress?: () => void;
}

export default function VideoCard({
    videoUrl,
    title,
    description,
    duration,
    onPress
}: VideoCardProps) {
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const heightAnim = useRef(new Animated.Value(220)).current;
    const translateYAnim = useRef(new Animated.Value(-20)).current;

    const player = useVideoPlayer(videoUrl, player => {
        player.loop = true;
        player.play();
    });

    const handleToggle = () => {
        const newExpanded = !expanded;
        setExpanded(newExpanded);

        if (newExpanded) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.ease),
                }),
                Animated.timing(heightAnim, {
                    toValue: 400,
                    duration: 400,
                    useNativeDriver: false,
                    easing: Easing.out(Easing.cubic),
                }),
                Animated.timing(translateYAnim, {
                    toValue: 60,
                    duration: 400,
                    useNativeDriver: true,
                    easing: Easing.out(Easing.back(1)),
                })
            ]).start();

        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                    easing: Easing.in(Easing.ease),
                }),
                Animated.timing(heightAnim, {
                    toValue: 220,
                    duration: 350,
                    useNativeDriver: false,
                    easing: Easing.inOut(Easing.cubic),
                }),
                Animated.timing(translateYAnim, {
                    toValue: -20,
                    duration: 350,
                    useNativeDriver: true,
                    easing: Easing.inOut(Easing.cubic),
                })
            ]).start();

        }

        if (onPress) onPress();
    };

    return (
        <Pressable
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.2,
                shadowRadius: 3.84,
                elevation: 5,
            }}
            className="rounded-2xl mb-4"
            onPress={handleToggle}
        >
            <Animated.View
                style={{
                    height: heightAnim,
                }}
                className="w-full bg-white dark:bg-neutral-800 rounded-2xl relative overflow-hidden"
            >
                <Animated.View style={{ opacity: fadeAnim, zIndex: 30 }}>
                    <LinearGradient className="w-full flex justify-between h-full z-30 p-6" colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)']}>
                        <View className="flex-row justify-end">
                            <Text className="text-white text-sm opacity-70 bg-black/70 px-2 py-1 rounded-full">{duration}</Text>
                        </View>
                        <View className="flex flex-row justify-between items-center">
                            <View>
                                <Text className="text-white text-xl font-bold">{title}</Text>
                                <Text className="text-white text-sm opacity-90">{description}</Text>
                            </View>
                            <BlurView intensity={20} tint="dark" className="rounded-full p-3 bg-black/50 overflow-hidden">
                                <Feather name="play" size={20} color="white" />
                            </BlurView>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {error ? (
                    <View className="absolute top-0 left-0 w-full h-full items-center justify-center z-20">
                        <View className="p-4 bg-red-500/10 rounded-lg">
                            <Text className="text-red-500">{error}</Text>
                        </View>
                    </View>
                ) : (
                    <Animated.View
                        className="absolute top-0 left-0 scale-[200%] z-10"
                        style={{
                            width: '100%',
                            height: 500,
                            top: -200,
                            transform: [{ translateY: translateYAnim }]
                        }}
                    >
                        <VideoView
                            player={player}
                            style={{ width: '100%', height: 500, transform: [{ scale: 1.5 }] }}
                            nativeControls={false}
                        />
                    </Animated.View>
                )}
            </Animated.View>
        </Pressable>
    );
}
