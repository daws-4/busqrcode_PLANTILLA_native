import { Screen } from "../../components/busqrcode/Screen"
import { useEffect, useState } from "react"
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Alert,
  View, Text, Pressable, ScrollView, ActivityIndicator
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useBusIdContext, useBusIdToggleContext, useBusListContext } from "../../lib/AuthProvider";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { FlashOff, FlashOn } from "../../components/busqrcode/Icons";
import { router, Link } from "expo-router";
import { useBlePermissions } from "../../hooks/useBlePermissions";
import { stringToBytes, bytesToString, tryParseJSON } from "../../lib/bleHelper";

import axios from "axios";
export default function Scanqr() {
  // Camera state
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState(false);
  const [type, setType] = useState<CameraType>("back");
  const [text, setText] = useState("");

  // Bus data state
  const [busId, setBusId] = useState<string | null>(null);
  const busData = useBusIdContext();
  const busList = useBusListContext();
  const setBusData = useBusIdToggleContext();

  // BLE state
  const { permissionsGranted: blePermissionsGranted, requestPermissions: requestBlePermissions } = useBlePermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [bleData, setBleData] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("");
  const [discoveredDevices, setDiscoveredDevices] = useState<Array<{ id: string, name: string }>>([]);

  // Discovered BLE UUIDs
  const [bleServiceUUID, setBleServiceUUID] = useState<string | null>(null);
  const [bleReadCharUUID, setBleReadCharUUID] = useState<string | null>(null);
  const [bleWriteCharUUID, setBleWriteCharUUID] = useState<string | null>(null);

  // BLE Manager setup - usar NativeEventEmitter de React Native
  const BleManagerModule = NativeModules.BleManager;
  const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


  // ===== BLE FUNCTIONS =====

  /**
   * Inicializa BLE Manager y configura listeners
   */
  const initializeBLE = async () => {
    try {
      console.log('🔄 Intentando iniciar BLE Manager...');
      await BleManager.start({ showAlert: false });
      console.log('✅ BLE Manager iniciado exitosamente');

      // Verificar estado de Bluetooth
      const isEnabled = await BleManager.checkState();
      console.log('📡 Estado de Bluetooth:', isEnabled);
    } catch (error) {
      console.error('❌ Error iniciando BLE Manager:', error);
      Alert.alert('Error BLE', 'No se pudo iniciar el gestor de Bluetooth');
    }
  };


  /**
   * Conecta al dispositivo BLE encontrado
   */
  const connectToDevice = async (peripheralId: string, deviceName: string) => {
    setIsConnecting(true);
    setConnectionStatus(`📡 Conectando a ${deviceName}...`);

    try {
      // Detener escaneo
      await BleManager.stopScan();
      setIsScanning(false);

      console.log(`📡 Conectando a ${deviceName} (${peripheralId})...`);

      // Conectar
      await BleManager.connect(peripheralId);
      console.log('✅ Conectado');

      setConnectedDevice(peripheralId);
      setConnectionStatus(`✅ Conectado a ${deviceName}`);

      // Recuperar servicios
      await BleManager.retrieveServices(peripheralId);
      console.log('✅ Servicios recuperados');

      // Autenticar y leer datos
      await authenticateAndReadData(peripheralId);

    } catch (error) {
      console.error('❌ Error de conexión:', error);
      Alert.alert('Error', `No se pudo conectar a ${deviceName}`);
      setConnectedDevice(null);
      setConnectionStatus('❌ Error de conexión');
      setIsConnecting(false);
    }
  };

  /**
   * Descubre automáticamente los UUIDs del servicio y características
   */
  const discoverBleUUIDs = async (peripheralId: string) => {
    try {
      setConnectionStatus('🔍 Descubriendo servicios y características...');

      // Obtener información del dispositivo con servicios y características
      const peripheralInfo = await BleManager.retrieveServices(peripheralId);
      console.log('📋 Información del dispositivo:', JSON.stringify(peripheralInfo, null, 2));

      if (!peripheralInfo.services || peripheralInfo.services.length === 0) {
        throw new Error('No se encontraron servicios BLE');
      }

      // Tomar el primer servicio disponible (ajustar según tu lógica)
      // peripheralInfo.services puede ser un array de objetos Service con propiedad uuid
      const firstService = peripheralInfo.services[0];
      const serviceUUID = typeof firstService === 'string' ? firstService : (firstService as any).uuid || String(firstService);
      console.log('✅ Servicio descubierto:', serviceUUID);
      setBleServiceUUID(serviceUUID);

      // Buscar características
      if (!peripheralInfo.characteristics || peripheralInfo.characteristics.length === 0) {
        throw new Error('No se encontraron características BLE');
      }

      // Buscar características de lectura y escritura
      let readChar: string | null = null;
      let writeChar: string | null = null;

      peripheralInfo.characteristics.forEach((char: any) => {
        console.log(`📝 Característica: ${char.characteristic}, Propiedades:`, char.properties);

        // Buscar característica con propiedad Read
        if (char.properties && char.properties.Read && !readChar) {
          readChar = char.characteristic;
          console.log('✅ Característica de lectura encontrada:', readChar);
        }

        // Buscar característica con propiedad Write o WriteWithoutResponse
        if (char.properties && (char.properties.Write || char.properties.WriteWithoutResponse) && !writeChar) {
          writeChar = char.characteristic;
          console.log('✅ Característica de escritura encontrada:', writeChar);
        }
      });

      if (!readChar || !writeChar) {
        throw new Error('No se encontraron características de lectura/escritura');
      }

      setBleReadCharUUID(readChar);
      setBleWriteCharUUID(writeChar);

      console.log('✅ UUIDs descubiertos:');
      console.log(`   Servicio: ${serviceUUID}`);
      console.log(`   Lectura: ${readChar}`);
      console.log(`   Escritura: ${writeChar}`);

      return { serviceUUID, readChar, writeChar };

    } catch (error) {
      console.error('❌ Error descubriendo UUIDs:', error);
      throw error;
    }
  };

  /**
   * Autentica con el ID de la unidad y lee los datos
   */
  const authenticateAndReadData = async (peripheralId: string) => {
    if (!busData) return;

    try {
      // Primero descubrir los UUIDs
      const { serviceUUID, readChar, writeChar } = await discoverBleUUIDs(peripheralId);

      setConnectionStatus('🔐 Autenticando...');

      // La clave es el _id de la unidad
      const authKey = busData._id;
      console.log(`🔐 Enviando clave de autenticación: ${authKey}`);

      // Convertir clave a bytes
      const authBytes = stringToBytes(authKey);

      // Escribir clave de autenticación
      await BleManager.write(
        peripheralId,
        serviceUUID,
        writeChar,
        authBytes
      );

      console.log('✅ Clave enviada');
      setConnectionStatus('📥 Leyendo datos...');

      // Esperar un momento para que el dispositivo procese
      await new Promise(resolve => setTimeout(resolve, 500));

      // Leer datos del dispositivo
      const data = await BleManager.read(
        peripheralId,
        serviceUUID,
        readChar
      );

      console.log('📥 Datos recibidos (bytes):', data);

      // Convertir bytes a string
      const dataString = bytesToString(data);
      console.log('📥 Datos recibidos (string):', dataString);

      // Intentar parsear como JSON
      let parsedData = tryParseJSON(dataString);

      // Si no es JSON válido, intentar parsear manualmente
      if (!parsedData) {
        console.log('⚠️ Los datos no son JSON válido, usando como texto');
        parsedData = { raw: dataString };
      }

      console.log('✅ Datos parseados:', parsedData);

      // Guardar datos
      setBleData(parsedData);
      setConnectionStatus('✅ Datos recibidos');
      setIsConnecting(false);

      Alert.alert(
        'Datos Recibidos',
        `Conteo: ${parsedData.conteo || 'N/A'}\nUnidad ${busData.numero}: ${parsedData[`Unidad_${busData.numero}`] || 'N/A'}`,
        [
          {
            text: 'OK',
            onPress: () => disconnectDevice()
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error en autenticación/lectura:', error);
      Alert.alert('Error', 'No se pudieron obtener los datos del dispositivo');
      setConnectionStatus('❌ Error obteniendo datos');
      setIsConnecting(false);
    }
  };

  /**
   * Desconecta del dispositivo BLE
   */
  const disconnectDevice = async () => {
    if (!connectedDevice) return;

    try {
      await BleManager.disconnect(connectedDevice);
      console.log('🔌 Desconectado');
      setConnectedDevice(null);
      setBleData(null);
      setConnectionStatus('');
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  };

  // ===== EFFECTS =====

  /**
   * Inicialización al montar el componente
   */
  useEffect(() => {
    // Inicializar BLE Manager
    initializeBLE();

    // Listener: Dispositivo descubierto
    const discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      (peripheral: any) => {
        console.log('🔍 ========== DISPOSITIVO DETECTADO ==========');
        console.log('📱 Nombre:', peripheral.name || '<SIN NOMBRE>');
        console.log('🆔 ID:', peripheral.id);
        console.log('📡 RSSI:', peripheral.rssi);
        console.log('📋 Objeto completo:', JSON.stringify(peripheral, null, 2));

        // Agregar dispositivo a la lista si tiene nombre
        if (peripheral.name) {
          console.log('✅ Dispositivo tiene nombre, agregando a lista...');
          setDiscoveredDevices(prevDevices => {
            // Evitar duplicados
            const exists = prevDevices.some(d => d.id === peripheral.id);
            if (!exists) {
              console.log(`➕ AGREGANDO: ${peripheral.name} (${peripheral.id})`);
              return [...prevDevices, { id: peripheral.id, name: peripheral.name }];
            } else {
              console.log(`⚠️ Dispositivo ya existe en lista: ${peripheral.name}`);
            }
            return prevDevices;
          });
        } else {
          console.log('⚠️ Dispositivo SIN NOMBRE, no se agrega a lista');
        }
        console.log('============================================');
      }
    );

    // Listener: Escaneo detenido
    const stopScanListener = bleManagerEmitter.addListener(
      'BleManagerStopScan',
      () => {
        console.log('⏹️ ========== ESCANEO DETENIDO ==========');
        console.log('📊 Total de dispositivos descubiertos:', discoveredDevices.length);
        console.log('📱 Dispositivos:', discoveredDevices.map(d => d.name).join(', ') || 'NINGUNO');
        setIsScanning(false);

        if (discoveredDevices.length === 0) {
          console.log('⚠️ NO SE ENCONTRARON DISPOSITIVOS BLE');
          setConnectionStatus('⚠️ No se encontraron dispositivos BLE');
        } else {
          console.log(`✅ SE ENCONTRARON ${discoveredDevices.length} DISPOSITIVO(S)`);
          setConnectionStatus(`✅ Se encontraron ${discoveredDevices.length} dispositivo(s)`);
        }
        console.log('=========================================');
      }
    );

    // Listener: Desconexión
    const disconnectListener = bleManagerEmitter.addListener(
      'BleManagerDisconnectPeripheral',
      ({ peripheral }: any) => {
        console.log('🔌 Dispositivo desconectado:', peripheral);
        if (peripheral === connectedDevice) {
          setConnectedDevice(null);
          setBleData(null);
          setConnectionStatus('🔌 Desconectado');
        }
      }
    );

    // Solicitar permisos de cámara
    if (!permission) {
      requestPermission();
    }

    // Cleanup al desmontar
    return () => {
      // Usar removeAllListeners o removeSubscription según versión de BleManager
      bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
      bleManagerEmitter.removeAllListeners('BleManagerStopScan');
      bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');

      if (connectedDevice) {
        BleManager.disconnect(connectedDevice).catch(console.error);
      }
    };
  }, [busData]); // Re-ejecutar si cambia busData


  /**
  * Escanea dispositivos BLE y muestra lista para selección manual
  * @param busDataParam - Datos de la unidad a conectar (opcional, usa state si no se provee)
  */
  const startBleScan = async (busDataParam?: any) => {
    // Usar parámetro o estado
    const currentBusData = busDataParam || busData;

    console.log('📊 Datos de bus recibidos:', currentBusData);

    if (!currentBusData) {
      console.log('⚠️ No hay busData, abortando escaneo');
      Alert.alert('Error', 'Primero escanea el código QR de la unidad');
      return;
    }

    console.log('🔑 Verificando permisos BLE...');
    console.log('🔑 blePermissionsGranted:', blePermissionsGranted);

    if (!blePermissionsGranted) {
      console.log('🚨 Permisos BLE no otorgados, solicitando...');
      const granted = await requestBlePermissions();
      console.log('🔑 Permisos otorgados:', granted);
      if (!granted) {
        Alert.alert('Permisos Requeridos', 'Se necesitan permisos de Bluetooth para conectar con el dispositivo');
        return;
      }
    }

    setDiscoveredDevices([]); // Limpiar lista de dispositivos
    setIsScanning(true);
    setConnectionStatus(`🔍 Buscando dispositivos BLE...`);

    try {
      console.log(`🔍 ========== INICIANDO ESCANEO BLE ==========`);
      console.log(`🏢 Unidad: ${currentBusData.numero}`);
      console.log(`🆔 ID: ${currentBusData._id}`);
      console.log(`📅 Tiempo de escaneo: 15 segundos`);
      console.log(`📡 Buscando TODOS los dispositivos BLE disponibles...`);

      // Escanear todos los dispositivos BLE disponibles
      await BleManager.scan({ seconds: 15, allowDuplicates: false });
      console.log('✅ Comando de escaneo ejecutado correctamente');
      console.log('⏳ Esperando dispositivos... (listener activo)');

    } catch (error) {
      console.error('❌ Error al iniciar escaneo:', error);
      Alert.alert('Error', 'No se pudo iniciar el escaneo BLE');
      setIsScanning(false);
      setConnectionStatus('');
    }
  };


  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (data == busId) return;
    setBusId(data);
    let found = false;
    try {
      busList.map((bus: any) => {
        if (bus._id == data) {
          console.log('✅ Unidad encontrada:', bus);
          setBusData(bus);
          found = true;

          // Iniciar escaneo BLE INMEDIATAMENTE con los datos del bus
          console.log('🚀 Iniciando escaneo BLE automático con datos de unidad...');
          // Pasar directamente el objeto bus para evitar esperar actualización de estado
          startBleScan(bus);
        }
      });

      if (!found) {
        // Si no se encontró ninguna coincidencia
        console.log('❌ Código QR no corresponde a ninguna unidad');
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
                    setBleData(null);
                    setConnectedDevice(null);
                    setConnectionStatus('');
                  }}
                  className="p-3 bg-light-secondary rounded items-center justify-center border-slate-800 border-2"
                >
                  <Text className="text-lg font-bold text-light-text">Escánear de nuevo</Text>
                </Pressable>

                {/* BLE Status - Escaneo Automático */}
                {(isScanning || isConnecting) && (
                  <View className="mt-4 p-3 bg-blue-100 rounded border-blue-500 border-2">
                    <View className="flex flex-row items-center justify-center gap-2">
                      <ActivityIndicator color="#3b82f6" />
                      <Text className="text-md font-bold text-blue-700">
                        {isScanning ? '🔍 Escaneando dispositivos BLE...' : '📡 Conectando...'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* BLE Status */}
                {connectionStatus && (
                  <View className="mt-3 p-3 bg-light-secondary rounded">
                    <Text className="text-sm text-light-text text-center">
                      {connectionStatus}
                    </Text>
                  </View>
                )}

                {/* Lista de Dispositivos Descubiertos */}
                {discoveredDevices.length > 0 && !connectedDevice && (
                  <View className="mt-3">
                    <Text className="text-md font-bold text-light-text mb-2">
                      📱 Dispositivos Encontrados ({discoveredDevices.length}):
                    </Text>
                    {discoveredDevices.map((device) => (
                      <Pressable
                        key={device.id}
                        onPress={() => connectToDevice(device.id, device.name)}
                        disabled={isConnecting}
                        className={`p-3 mb-2 rounded border-2 ${isConnecting
                          ? 'bg-gray-300 border-gray-400'
                          : 'bg-white border-blue-500'
                          }`}
                      >
                        <View className="flex flex-row justify-between items-center">
                          <View className="flex-1">
                            <Text className="text-md font-bold text-gray-800">
                              {device.name}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1">
                              ID: {device.id}
                            </Text>
                          </View>
                          <Text className="text-blue-600 font-bold ml-2">
                            {isConnecting ? '...' : 'Conectar →'}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* BLE Data Display */}
                {bleData && (
                  <View className="mt-3 p-4 bg-green-50 rounded border-green-500 border-2">
                    <Text className="text-lg font-bold text-green-800 mb-2">
                      📊 Datos del Dispositivo
                    </Text>
                    <Text className="text-md text-green-700">
                      <Text className="font-bold">Conteo: </Text>
                      {bleData.conteo || 'N/A'}
                    </Text>
                    <Text className="text-md text-green-700">
                      <Text className="font-bold">Unidad {busData.numero}: </Text>
                      {bleData[`Unidad_${busData.numero}`] || 'N/A'}
                    </Text>
                    {bleData.raw && (
                      <Text className="text-xs text-green-600 mt-2">
                        Raw: {bleData.raw}
                      </Text>
                    )}
                  </View>
                )}

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