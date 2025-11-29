import { Screen } from "../../components/busqrcode/Screen"
import { useEffect, useState } from "react"
import { View, Text, Pressable, ScrollView } from "react-native"
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
            <CameraView
              onBarcodeScanned={handleBarCodeScanned}
              facing={type}
              enableTorch={flash}
              style={{ width: 400, height: 400 }}
            >
              <View className='flex p-4 ml-6 w-14'>

                <Pressable onPress={toggleFlash} className='bg-slate-100 '>
                  {flash ? <FlashOn /> : <FlashOff />}
                </Pressable>
              </View>
            </CameraView>
          ) : (
            <Text>Se han negado los permisos a la cámara</Text>
          )}
          <Pressable onPress={toggleFlash} >
          </Pressable>
          {busData ? (
            <View className="mt-6 p-4">
              <Text className="text-black text-black/90 mb-2 mx-4 text-lg">
                <Text className="font-bold text-black">Unidad: </Text>
                {busData.numero}
              </Text>

              <View>
                <Pressable
                  onPress={() => {
                    setBusId(null);
                    setBusData(null);
                  }}
                  className="p-3 bg-slate-200 rounded items-center justify-center border-slate-800 border-2"
                >
                  <Text className="text-lg font-bold">Escánear de nuevo</Text>
                </Pressable>
                <Link asChild href="/scaner">
                  <Pressable className="mt-4 p-3 bg-emerald-400 rounded items-center justify-center border-slate-800 border-2">
                    <Text className="text-lg font-bold">Enviar Datos</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          ) : (
            <View className="mt-5 p-4 bg-slate-200 rounded">
              <Text className="text-xl ">
                Apunta al código QR que está en la unidad
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}