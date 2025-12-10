import { Screen } from "../../components/busqrcode/Screen";
import { useEffect, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  Alert,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

interface BTDevice {
  id: string;
  name: string;
  address: string;
  bonded?: boolean;
}

export default function Scanqr() {
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [key, setKey] = useState("");
  const [receivedData, setReceivedData] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request Bluetooth permissions for Android
    requestBluetoothPermissions();

    // Check if Bluetooth is enabled
    checkBluetoothEnabled();

    return () => {
      // Cleanup: disconnect if connected
      if (selectedDevice && connected) {
        disconnectDevice();
      }
    };
  }, []);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        // Request permissions for Android 12+
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Permisos Bluetooth concedidos');
        } else {
          Alert.alert('Permisos denegados', 'Se requieren permisos de Bluetooth para continuar');
        }
      } catch (err) {
        console.error('Error solicitando permisos:', err);
      }
    }
  };

  const checkBluetoothEnabled = async () => {
    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        Alert.alert(
          'Bluetooth desactivado',
          'Por favor, activa el Bluetooth para continuar',
          [
            {
              text: 'Activar',
              onPress: async () => {
                try {
                  await RNBluetoothClassic.requestBluetoothEnabled();
                } catch (error) {
                  console.error('Error activando Bluetooth:', error);
                }
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      console.error('Error verificando estado de Bluetooth:', error);
    }
  };

  const scanDevices = async () => {
    try {
      setScanning(true);
      setDevices([]);
      console.log('Iniciando escaneo de dispositivos...');

      // Get bonded devices
      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log('Dispositivos vinculados:', bondedDevices);

      // Start discovery for unpaired devices
      const unpaired = await RNBluetoothClassic.startDiscovery();
      console.log('Dispositivos descubiertos:', unpaired);

      // Combine both lists
      const allDevices = [...bondedDevices, ...unpaired];

      const formattedDevices = allDevices.map((device: any) => ({
        id: device.id || device.address,
        name: device.name || 'Dispositivo sin nombre',
        address: device.address,
        bonded: device.bonded || false,
      }));

      setDevices(formattedDevices);
      console.log('Dispositivos encontrados:', formattedDevices.length);
    } catch (error) {
      console.error('Error escaneando dispositivos:', error);
      Alert.alert('Error', 'No se pudieron escanear los dispositivos Bluetooth');
    } finally {
      setScanning(false);
    }
  };

  const connectToDevice = async (device: BTDevice) => {
    try {
      setLoading(true);
      console.log('Conectando a dispositivo:', device.name, device.address);

      const connectedDevice = await RNBluetoothClassic.connectToDevice(device.address);

      if (connectedDevice) {
        setSelectedDevice(connectedDevice);
        setConnected(true);
        setShowKeyInput(true);
        console.log('Conectado exitosamente a:', device.name);
        Alert.alert('Conectado', `Conectado a ${device.name}`);
      }
    } catch (error) {
      console.error('Error conectando a dispositivo:', error);
      Alert.alert('Error de conexión', 'No se pudo conectar al dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const sendKey = async () => {
    if (!selectedDevice || !key) {
      Alert.alert('Error', 'Por favor ingresa una clave');
      return;
    }

    try {
      setLoading(true);
      console.log('Enviando clave:', key);

      // Send the key to the device
      await selectedDevice.write(key + '\n');
      console.log('Clave enviada');

      // Wait for response
      setTimeout(async () => {
        try {
          const available = await selectedDevice.available();
          console.log('Bytes disponibles:', available);

          if (available > 0) {
            const data = await selectedDevice.read();
            console.log('Datos recibidos:', data);

            if (data) {
              const dataString = typeof data === 'string' ? data : String(data);
              setReceivedData(dataString);
              setShowKeyInput(false);
              Alert.alert('Éxito', 'Datos recibidos correctamente');
            } else {
              Alert.alert('Error', 'No se recibieron datos. Verifica la clave.');
            }
          } else {
            Alert.alert('Error', 'No se recibieron datos. Verifica la clave.');
          }
        } catch (readError) {
          console.error('Error leyendo datos:', readError);
          Alert.alert('Error', 'Error al leer los datos del dispositivo');
        }
      }, 1000); // Wait 1 second for device to respond

    } catch (error) {
      console.error('Error enviando clave:', error);
      Alert.alert('Error', 'No se pudo enviar la clave al dispositivo');
    } finally {
      setLoading(false);
    }
  };

  const disconnectDevice = async () => {
    try {
      if (selectedDevice) {
        await selectedDevice.disconnect();
        setConnected(false);
        setSelectedDevice(null);
        setShowKeyInput(false);
        setKey("");
        setReceivedData("");
        console.log('Dispositivo desconectado');
      }
    } catch (error) {
      console.error('Error desconectando:', error);
    }
  };

  return (
    <Screen>
      <ScrollView className="flex-1 p-4">
        <View className="flex flex-col">
          <Text className="text-2xl font-bold text-light-text mb-4">
            Dispositivos Bluetooth
          </Text>

          {!connected && (
            <>
              <Pressable
                onPress={scanDevices}
                disabled={scanning}
                className={`p-4 rounded mb-4 items-center ${scanning ? 'bg-gray-400' : 'bg-blue-500'
                  }`}
              >
                {scanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold text-lg">
                    Escanear Dispositivos
                  </Text>
                )}
              </Pressable>

              <View className="mb-4">
                <Text className="text-light-text font-bold mb-2">
                  Dispositivos disponibles: {devices.length}
                </Text>
                {devices.map((device) => (
                  <Pressable
                    key={device.id}
                    onPress={() => connectToDevice(device)}
                    className="bg-light-secondary p-4 mb-2 rounded border-2 border-slate-700"
                  >
                    <Text className="text-light-text font-bold text-lg">
                      {device.name}
                    </Text>
                    <Text className="text-light-text text-sm">
                      {device.address}
                    </Text>
                    {device.bonded && (
                      <Text className="text-green-500 text-xs mt-1">
                        ● Vinculado
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {connected && selectedDevice && (
            <View className="mt-4">
              <View className="bg-green-100 p-4 rounded mb-4">
                <Text className="text-green-800 font-bold">
                  ✓ Conectado a: {selectedDevice.name}
                </Text>
              </View>

              {showKeyInput && (
                <View className="mb-4">
                  <Text className="text-light-text font-bold mb-2">
                    Ingresa la clave:
                  </Text>
                  <TextInput
                    value={key}
                    onChangeText={setKey}
                    placeholder="Clave de acceso"
                    placeholderTextColor="#999"
                    className="bg-white p-4 rounded mb-4 text-black border-2 border-slate-700"
                    secureTextEntry
                  />
                  <Pressable
                    onPress={sendKey}
                    disabled={loading || !key}
                    className={`p-4 rounded items-center ${loading || !key ? 'bg-gray-400' : 'bg-green-500'
                      }`}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white font-bold text-lg">
                        Enviar Clave
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {receivedData && (
                <View className="bg-light-secondary p-4 rounded mb-4 border-2 border-green-500">
                  <Text className="text-light-text font-bold mb-2 text-lg">
                    Datos Recibidos:
                  </Text>
                  <Text className="text-light-text">{receivedData}</Text>
                </View>
              )}

              <Pressable
                onPress={disconnectDevice}
                className="p-4 bg-red-500 rounded items-center"
              >
                <Text className="text-white font-bold text-lg">
                  Desconectar
                </Text>
              </Pressable>
            </View>
          )}

          {loading && (
            <View className="mt-4 items-center">
              <ActivityIndicator size="large" color="#0000ff" />
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}