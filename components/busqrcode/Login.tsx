import { Screen } from "./Screen";
import { Stack, Link, Redirect } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Logo1 } from "./Logo1";
import axios from "axios";
import {
  useUserContext,
  useUserToggleContext,
  useBusListContext,
  useBusListToggleContext,
  UrlConnectionContext,
  lineaContext,
} from "../../lib/AuthProvider";
import { StatusBar } from "expo-status-bar";
export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const togglePassword = () => setShowPassword(!showPassword);
  const user = useUserContext();
  const login = useUserToggleContext();
  const busList = useBusListContext();
  const linea = lineaContext();
  const now = new Date();
  const url = UrlConnectionContext();
  const submitData = async () => {
    if (isSubmitting) return;
    if (username != "" && password != "") {
      setIsSubmitting(true);
      try {
        const response = await axios.post(`${url}/api/auth/fiscales`, {
          username,
          password,
        });
        if (response.status === 200) {
          login(response.data);
          // router.push("/scaner");
        } else if (response.status === 401) {
          alert("Usuario o contraseña incorrectos");
        } else {
          alert("No se puede conectar al servidor");
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          alert("Usuario o contraseña incorrectos");
        } else {
          alert("No se puede conectar al servidor");
        }
      } finally {
        setIsSubmitting(false); // Establecer isSubmitting a false al final
      }
    } else {
      alert("Por favor, llena todos los campos");
    }
  };
  if (user !== null) {
    return <Redirect href="/scaner" />;
  }
  return (
    <Screen>
      <View className="flex flex-cols justify-center items-center">
        <View className="bg-white px-2 pt-10 pb-2 flex flex-row justify-between items-center border-b-2 border-stone-600 w-full">
          <Text className="text-xl text-black text-black/90 ">
            Iniciar Sesión como Fiscal
          </Text>
        </View>
        <Logo1 />
        <Text className="text-xl text-black text-black/90 ">{linea}</Text>
      </View>
      <View className="mb-10 rounded-sm bg-slate-200 shadow-default dark:border-strokedark dark:bg-boxdark">
        <View className="flex justify-center items-center m-5">
          <Text className="font-bold text-3xl m-2 text-black text-black/90 ">
            Inicia Sesión
          </Text>
          <View className="w-full mt-4">
            <TextInput

              placeholder="Usuario"
              value={username}
              onChangeText={setUsername}
              className="p-4 mb-4 rounded-md text-black text-black/90  bg-slate-100 dark:bg-boxdark  text-xl"
            />
            <TextInput

              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={showPassword}
              className="p-4 mb-4 rounded-md text-black text-black/90  bg-slate-100 dark:bg-boxdark  text-xl"
            />
          </View>
          <Pressable
            className="p-2 m-4 bg-green-700 rounded border-2 border-green-800 "
            onPress={() => submitData()}
          >
            <Text className="text-white text-lg ">Iniciar Sesión</Text>
          </Pressable>
        </View>
      </View>
      <View>
        <Text className="text-black text-black/90 text-center">
          © {now.getFullYear()} {linea} ver.1.0
        </Text>
      </View>
      <StatusBar style="dark" />
    </Screen>
  );
}
