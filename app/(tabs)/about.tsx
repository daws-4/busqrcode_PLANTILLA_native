import { Link } from "expo-router";
import { Pressable, ScrollView, Text } from "react-native";
import { HomeIcon, LogoutIcon } from "../../components/busqrcode/Icons";
import {
  useUserContext,
  useUserToggleContext,
  useUserLogoutContext,
  useRutaContext,
  useRutaToggleContext,
} from "../../lib/AuthProvider";
import { styled } from "nativewind";
import { Screen } from "../../components/busqrcode/Screen";
import { Redirect } from "expo-router";
import { View } from "react-native";
import axios from "axios";
import { useEffect, useState } from "react";
const StyledPressable = styled(Pressable);

export default function About() {
  const logout = useUserLogoutContext();
  const rutas = useRutaContext();
  const user = useUserContext();

  return (
    <Screen>
      <ScrollView>
        <StyledPressable
          className="flex flex-row active:opacity-80 items-center mb-2 justify-end"
          onPress={() => logout()}
        >
          <View className="flex flex-row bg-slate-300 p-2 rounded border-2 border-slate-700">
            <Text className="text-lg mr-2">Cerrar Sesión</Text>
            <LogoutIcon />
          </View>
        </StyledPressable>

        <Text className="text-black font-bold mb-4 text-2xl">
          Info del Fiscal
        </Text>
        {user && (
          <View>
            <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
              <Text className="font-bold text-black">Nombre de usuario: </Text>
              {user.username}{" "}
              <Text className="font-bold text-black">Número: </Text> {user.numero}
            </Text>
            <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
              <Text className="font-bold text-black">Ubicación: </Text>
              {user.ubicacion}
            </Text>
            <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
              <Text className="font-bold text-black">Rutas Asignadas: </Text>
            </Text>
            {rutas.map((ruta:any) => (
              <Text
                className="text-black text-black/90 mb-2 mx-4 text-lg"
                key={ruta._id}
              >
                {ruta.nombre}
              </Text>
            ))}
          </View>
        )}

        <Text className="text-black font-bold mb-4 text-2xl">Guía de uso</Text>

        <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
          <Text className="font-bold text-black ">Paso 1: </Text>
          En la pestaña de "Escaner" presionar el botón "Escanear Código QR"
        </Text>
        <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
          <Text className="font-bold text-black ">Paso 2: </Text>
          Apunta al código QR que está en la unidad
        </Text>
        <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
          <Text className="font-bold text-black ">Paso 3: </Text>
          Selecciona la ruta que corresponede a la unidad en ese momento
        </Text>
        <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
          <Text className="font-bold text-black ">Paso 4: </Text>
          Presiona el botón "Enviar Datos"
        </Text>
      </ScrollView>
    </Screen>
  );
}
