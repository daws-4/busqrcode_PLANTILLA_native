import { Screen } from "../../components/busqrcode/Screen"
import { useEffect, useState } from "react"
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Alert,
  View, Text, Pressable, ScrollView
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useBusIdContext, useBusIdToggleContext, useBusListContext } from "../../lib/AuthProvider";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { FlashOff, FlashOn } from "../../components/busqrcode/Icons";
import { router, Link } from "expo-router";

import axios from "axios";
export default function Scanqr() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [type, setType] = useState<CameraType>("back");
  const [text, setText] = useState("");
  const [busId, setBusId] = useState<string | null>(null);
  const busData = useBusIdContext();
  const busList = useBusListContext();
  const setBusData = useBusIdToggleContext();

  // LÓGICA DE BLE
  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);



  if (!permission) {
    requestPermission();
  }
  useEffect(() => {
    const fetchData = async () => {
      if (!permission) {
        requestPermission();
      }
    };
    fetchData();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (data == busId) return;
    setBusId(data);
    let found = false;
    try {
      busList.map((bus: any) => {
        if (bus._id == data) {
          setBusData(bus)
          console.log(bus)
          found = true;
        }
      });
      if (!found) {
        // Si no se encontró ninguna coincidencia
        alert("Este código QR no corresponde a ninguna unidad");
      }
    } catch (error) {
      alert("Este código QR no corresponede a ninguna unidad");
      console.log(error + " error");
    }
    console.log("Type: " + type + "\nData: " + data);
  };
  if (busData) {
    console.log(busData, "test");
  }

  const toggleFlash = () => {
    setFlash(
      flash === false
        ? true
        : false
    );
    console.log(flash);
  };


  return (
    <Screen>
      <ScrollView>

        <View className="flex flex-col justify-center items-center">
          {permission ? (
            <View style={{ position: 'relative', width: 400, height: 400 }}>
              <CameraView
                onBarcodeScanned={handleBarCodeScanned}
                facing={type}
                enableTorch={flash}
                style={{ width: 400, height: 400 }}
              />
              <View style={{ position: 'absolute', top: 10, left: 45, zIndex: 10 }}>
                <Pressable onPress={toggleFlash} className='bg-light-secondary p-2 rounded'>
                  {flash ? <FlashOn /> : <FlashOff />}
                </Pressable>
              </View>
            </View>
          ) : (
            <Text className="text-light-text">Se han negado los permisos a la cámara</Text>
          )}
          {busData ? (
            <View className="mt-6 p-4">
              <Text className="text-light-text mb-2 mx-4 text-lg">
                <Text className="font-bold text-light-text">Unidad: </Text>
                {busData.numero}
              </Text>

              <View>
                <Pressable
                  onPress={() => {
                    setBusId(null);
                    setBusData(null);
                  }}
                  className="p-3 bg-light-secondary rounded items-center justify-center border-slate-800 border-2"
                >
                  <Text className="text-lg font-bold text-light-text">Escánear de nuevo</Text>
                </Pressable>
                <Link asChild href="/scaner">
                  <Pressable className="mt-4 p-3 bg-light-success rounded items-center justify-center border-slate-800 border-2">
                    <Text className="text-lg font-bold text-white">Enviar Datos</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : (
            <View className="mt-5 p-4 bg-light-secondary rounded">
              <Text className="text-xl text-light-text">
                Apunta al código QR que está en la unidad
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}