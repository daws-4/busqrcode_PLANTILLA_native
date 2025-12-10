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

interface ESP32Data {
  conteo?: number;
  "Unidad 1"?: string;
}

export default function TestBC() {
  const [devices, setDevices] = useState<BTDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [key, setKey] = useState("");
  const [receivedData, setReceivedData] = useState<string>("");
  const [parsedData, setParsedData] = useState<ESP32Data | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestBluetoothPermissions();
    checkBluetoothEnabled();

    return () => {
      if (selectedDevice && connected) {
        disconnectDevice();
      }
    };
  }, []);

  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
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
          console.log('✅ Permisos Bluetooth concedidos');
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
      console.log('🔍 Iniciando escaneo de dispositivos...');

      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log('📱 Dispositivos vinculados:', bondedDevices.length);

      const unpaired = await RNBluetoothClassic.startDiscovery();
      console.log('📡 Dispositivos descubiertos:', unpaired.length);

      const allDevices = [...bondedDevices, ...unpaired];

      const formattedDevices = allDevices.map((device: any) => ({
        id: device.id || device.address,
        name: device.name || 'Dispositivo sin nombre',
        address: device.address,
        bonded: device.bonded || false,
      }));

      setDevices(formattedDevices);
      console.log(`✅ Total dispositivos encontrados: ${formattedDevices.length}`);
    } catch (error) {
      console.error('❌ Error escaneando dispositivos:', error);
      Alert.alert('Error', 'No se pudieron escanear los dispositivos Bluetooth');
    } finally {
      setScanning(false);
    }
  };

  const connectToDevice = async (device: BTDevice) => {
    try {
      setLoading(true);
      console.log('🔗 Intentando conectar a:', device.name, device.address);

      let connectedDevice = null;

      try {
        // Intento 1: Conexión segura (requiere pairing)
        console.log('🔐 Intento 1: Conexión segura...');
        connectedDevice = await RNBluetoothClassic.connectToDevice(device.address);
      } catch (error) {
        console.log('⚠️ Conexión segura falló, intentando insegura...');
        // Intento 2: Conexión insegura (sin pairing)
        try {
          connectedDevice = await RNBluetoothClassic.connectToDevice(device.address, {
            connectorType: 'rfcomm',
            DELIMITER: '\n',
            DEVICE_CHARSET: 'utf-8'
          });
        } catch (error2) {
          throw new Error('No se pudo conectar con ningún método');
        }
      }

      if (connectedDevice) {
        setSelectedDevice(connectedDevice);
        setConnected(true);
        setShowKeyInput(true);
        console.log('✅ Conectado exitosamente a:', device.name);
        Alert.alert('✅ Conectado', `Conectado a ${device.name}`);

        // Configurar listener para datos entrantes
        setupDataListener(connectedDevice);
      }
    } catch (error) {
      console.error('❌ Error conectando a dispositivo:', error);
      Alert.alert(
        '❌ Error de Conexión',
        'No se pudo conectar al dispositivo.\n\n' +
        'Soluciones:\n' +
        '1. Verifica que el ESP32 esté encendido\n' +
        '2. Empareja el dispositivo en Configuración → Bluetooth\n' +
        '3. Asegúrate de estar cerca del dispositivo\n' +
        '4. Reinicia el Bluetooth de tu teléfono'
      );
    } finally {
      setLoading(false);
    }
  };

  const setupDataListener = (device: BluetoothDevice) => {
    console.log('🎧 Configurando listener de datos...');

    device.onDataReceived((event) => {
      const incomingData = event.data;
      console.log('📨 Datos recibidos del ESP32:', incomingData);

      setReceivedData(prev => {
        const newData = prev + incomingData;
        console.log('📝 Datos acumulados:', newData);

        // Intentar extraer y parsear el JSON
        try {
          const jsonMatch = newData.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            console.log('✅ JSON parseado exitosamente:', jsonData);
            setParsedData(jsonData);
          }
        } catch (e) {
          console.log('⏳ Esperando JSON completo...');
        }

        return newData;
      });
    });
  };

  const sendKey = async () => {
    if (!selectedDevice || !key) {
      Alert.alert('Error', 'Por favor ingresa una clave');
      return;
    }

    try {
      setLoading(true);
      setReceivedData('');
      setParsedData(null);

      console.log('🔑 Enviando clave al ESP32:', key);

      // ESP32 espera la clave con '\n' al final
      await selectedDevice.write(key + '\n');
      console.log('✅ Clave enviada correctamente');

      // Esperar a que el ESP32 responda (el listener capturará los datos)
      setTimeout(() => {
        setLoading(false);
        if (receivedData.includes('PIN CORRECTO')) {
          setShowKeyInput(false);
          Alert.alert('✅ Éxito', 'PIN correcto. Datos recibidos del ESP32');
        } else if (receivedData.includes('PIN INCORRECTO')) {
          Alert.alert('❌ Error', 'PIN incorrecto. Intenta de nuevo.');
          setKey('');
        }
      }, 2500);

    } catch (error) {
      console.error('❌ Error enviando clave:', error);
      Alert.alert('Error', 'No se pudo enviar la clave al dispositivo');
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
        setParsedData(null);
        console.log('🔌 Dispositivo desconectado');
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
            🔵 Bluetooth Classic - ESP32
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
                    🔍 Escanear Dispositivos
                  </Text>
                )}
              </Pressable>

              <View className="mb-4">
                <Text className="text-light-text font-bold mb-2">
                  📱 Dispositivos disponibles: {devices.length}
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
                    🔑 Ingresa el PIN del ESP32:
                  </Text>
                  <TextInput
                    value={key}
                    onChangeText={setKey}
                    placeholder="68c87fe7069f2f93dd7481f4"
                    placeholderTextColor="#999"
                    className="bg-white p-4 rounded mb-4 text-black border-2 border-slate-700"
                    autoCapitalize="none"
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
                        📤 Enviar PIN
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}

              {receivedData && (
                <View className="bg-light-secondary p-4 rounded mb-4 border-2 border-green-500">
                  <Text className="text-light-text font-bold mb-2 text-lg">
                    📨 Respuesta del ESP32:
                  </Text>
                  <Text className="text-light-text font-mono text-sm">
                    {receivedData}
                  </Text>
                </View>
              )}

              {parsedData && (
                <View className="bg-blue-100 p-4 rounded mb-4 border-2 border-blue-500">
                  <Text className="text-blue-800 font-bold mb-2 text-lg">
                    📊 Datos Parseados:
                  </Text>
                  <Text className="text-blue-800 text-base mb-1">
                    👥 Pasajeros del día: <Text className="font-bold">{parsedData.conteo}</Text>
                  </Text>
                  <Text className="text-blue-800 text-sm">
                    🆔 Unidad: {parsedData["Unidad 1"]}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={disconnectDevice}
                className="p-4 bg-red-500 rounded items-center"
              >
                <Text className="text-white font-bold text-lg">
                  🔌 Desconectar
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