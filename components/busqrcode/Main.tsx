import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
} from "react-native";
import {
  useUserContext,
  useBusIdContext,
  useRutaContext,
  useRutaToggleContext,
  useBusIdToggleContext,
  useBusListContext,
  useBusListToggleContext,
  useBusQueueContext,
  useBusQueueToggleContext,
  usePCounterContext,
  usePCounterToggleContext,
  ConnectionStateContext,
  ConnectionStateToggleContext,
  UrlConnectionContext,
} from "../../lib/AuthProvider";
import { Screen } from "./Screen";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import axios from "axios";
import { Link } from "expo-router";
import { DeleteIcon } from "./Icons";
import NetInfo from "@react-native-community/netinfo";
import RNBluetoothClassic, {
  BluetoothDevice,
} from 'react-native-bluetooth-classic';

// Define interfaces
interface User {
  _id: string;
  numero: string | number;
  setruta: boolean;
  sethora: boolean;
  setdelete: boolean;
}

interface Ruta {
  _id: string;
  nombre: string;
  fiscales: { fiscal_id: string }[];
}

interface Bus {
  _id: string;
  numero: string | number;
}

interface Registro {
  _id: string;
  id_unidad: string;
  timestamp_salida: string;
}

interface RequestData {
  id_ruta: string | null;
  id_unidad: string;
  timestamp_telefono: string;
  timestamp_salida: Date;
  id_fiscal: string;
  passenger_count?: number | null;
}

interface ESP32Data {
  conteo?: number;
  "Unidad 1"?: string;
}

export function Main() {
  const user = useUserContext() as User | null;
  const setRutas = useRutaToggleContext();
  const rutas = useRutaContext() as Ruta[];
  const busData = useBusIdContext() as Bus | null;
  const setBusData = useBusIdToggleContext();
  const busList = useBusListContext() as Bus[];
  const busQueue = useBusQueueContext() as RequestData[];
  const setBusQueue = useBusQueueToggleContext();
  const setBusList = useBusListToggleContext();
  const pCounter = usePCounterContext() as number | null;
  const setPCounter = usePCounterToggleContext();
  const connection = ConnectionStateContext();
  const url = UrlConnectionContext();
  const setConnection = ConnectionStateToggleContext();

  const [selectedRuta, setSelectedRuta] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedRealTime, setSelectedRealTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [getRegistros, setGetRegistros] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // requestQueue doesn't seem to be used other than initialization, but typing it anyway
  const [requestQueue, setRequestQueue] = useState<RequestData[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const [connectionTest, setConnectionTest] = useState(true);

  // Bluetooth Classic states
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(null);
  const [connected, setConnected] = useState(false);
  const [btLoading, setBtLoading] = useState(false);
  const [receivedData, setReceivedData] = useState<string>("");
  const [parsedData, setParsedData] = useState<ESP32Data | null>(null);
  const [btStatusMessage, setBtStatusMessage] = useState("");

  //-------------------------- IMPORTANTE -----------------------

  //que el fiscal que marque salida pueda definir la hora a la que debe llegar el bus a determinado punto

  // ----------------      PENDIENTE ----------------------
  const fetchData = async () => {
    setIsLoading(true); // Iniciar carga
    try {
      const data = (await axios.get(`${url}/api/app/rutas`)).data as Ruta[];
      let rutasl: Ruta[] = [];
      for (let r of data) {
        for (let f of r.fiscales) {
          if (f.fiscal_id == user?._id) {
            rutasl.push(r);
          }
        }
      }
      const buses = (await axios.get(`${url}/api/app/unidades`)).data as Bus[];

      fetchRegistros();
      setBusList(buses);
      setRutas(rutasl);
    } catch (error) {
      console.log(busList, rutas);
      // console.log(error + " error");
    } finally {
      setIsLoading(false); // Finalizar carga
    }
  };
  const fetchRegistros = async () => {
    setIsLoading(true); // Iniciar carga
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            10000
        )
      );

      if (user?.sethora) {
        const fetchPromise = axios.post(`${url}/api/app/timestamp/fiscal`, {
          numero_fiscal: user?.numero,
          id_fiscal: user?._id,
        });

        const response: any = await Promise.race([fetchPromise, timeout]);

        const sortedData = (response.data as Registro[]).sort(
          (a, b) => new Date(b.timestamp_salida).getTime() - new Date(a.timestamp_salida).getTime()
        );
        setGetRegistros(sortedData);
      }
    } catch (error: any) {
      Alert.alert("Error", "La solicitud tardó demasiado en responder. Verifique su conexión.");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    // Solo pedir permisos de Bluetooth si el fiscal tiene sethora habilitado
    if (user?.sethora) {
      requestBluetoothPermissions();
    }
    fetchData();
  }, [user?.sethora]);

  // función para eliminar los registros de la base de datos

  const deleteRegistro = async (id: string) => {
    Alert.alert(
      "Alerta",
      "¿Estás seguro de que quieres eliminar este registro?",
      [
        {
          text: "Cancelar",
          onPress: () => console.log("Cancelado"),
          style: "cancel",
        },
        {
          text: "OK",
          onPress: async () => {
            try {
              const response = await axios.delete(
                `${url}/api/app/timestamp/fiscal/${id}`
              );
              if (response.status === 200) {
                alert("Registro eliminado");
                const newRegistros = getRegistros.filter((r) => r._id !== id);
                setGetRegistros(newRegistros);
              }
            } catch (error) {
              alert("error");
              console.log(error + " error");
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  // ==================== BLUETOOTH CLASSIC FUNCTIONS ====================

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

  const scanAndConnectToDevice = async (deviceName: string, key: string) => {
    try {
      setBtLoading(true);
      setBtStatusMessage("");
      console.log('🔍 Buscando dispositivo:', deviceName);

      await checkBluetoothEnabled();

      // Cancelar cualquier discovery previo que esté activo
      try {
        await RNBluetoothClassic.cancelDiscovery();
        console.log('🛑 Discovery anterior cancelado');
      } catch (error) {
        // Si no hay discovery activo, ignorar el error
        console.log('ℹ️ No había discovery activo para cancelar');
      }

      const bondedDevices = await RNBluetoothClassic.getBondedDevices();
      console.log('📱 Dispositivos vinculados:', bondedDevices.length);

      const unpaired = await RNBluetoothClassic.startDiscovery();
      console.log('📡 Dispositivos descubiertos:', unpaired.length);

      const allDevices = [...bondedDevices, ...unpaired];

      const targetDevice = allDevices.find(
        (device: any) => device.name === deviceName
      );

      if (!targetDevice) {
        console.log('❌ Dispositivo no encontrado:', deviceName);
        console.log('ℹ️ Continuando sin datos del ESP32');
        setPCounter(null);
        setBtLoading(false);
        return;
      }

      console.log('✅ Dispositivo encontrado, conectando...');
      await connectToDevice(targetDevice, key);
    } catch (error) {
      console.error('❌ Error en escaneo:', error);
      console.log('ℹ️ Continuando sin datos del ESP32');
      setPCounter(null);
      setBtLoading(false);
    }
  };

  const connectToDevice = async (device: any, key: string) => {
    try {
      console.log('🔗 Intentando conectar a:', device.name, device.address);

      let connectedDevice = null;

      try {
        // Intento 1: Conexión segura
        console.log('🔐 Intento 1: Conexión segura...');
        connectedDevice = await RNBluetoothClassic.connectToDevice(device.address);
      } catch (error) {
        console.log('⚠️ Conexión segura falló, intentando insegura...');
        // Intento 2: Conexión insegura
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
        console.log('✅ Conectado exitosamente a:', device.name);

        // Configurar listener y enviar clave
        setupDataListener(connectedDevice);
        await sendKey(connectedDevice, key);
      }
    } catch (error) {
      console.error('❌ Error conectando a dispositivo:', error);
      console.log('ℹ️ Continuando sin datos del ESP32');
      setPCounter(null);
      setBtLoading(false);
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
            const jsonData = JSON.parse(jsonMatch[0]) as ESP32Data;
            console.log('✅ JSON parseado exitosamente:', jsonData);
            setParsedData(jsonData);

            // Actualizar el contexto PCounter
            if (jsonData.conteo !== undefined) {
              // Defer state updates to avoid updating during render
              setTimeout(() => {
                setPCounter(jsonData.conteo);
                setBtStatusMessage("Datos de pasajeros recibidos correctamente");
              }, 0);
              console.log('✅ PCounter actualizado:', jsonData.conteo);
            }
          }
        } catch (e) {
          console.log('⏳ Esperando JSON completo...');
        }

        return newData;
      });
    });
  };

  const sendKey = async (device: BluetoothDevice, key: string) => {
    try {
      console.log('🔑 Enviando clave al ESP32:', key);
      await device.write(key + '\n');
      console.log('✅ Clave enviada correctamente');

      // Esperar respuesta
      setTimeout(() => {
        setBtLoading(false);
      }, 2500);
    } catch (error) {
      console.error('❌ Error enviando clave:', error);
      setBtLoading(false);
    }
  };

  const disconnectDevice = async () => {
    try {
      if (selectedDevice) {
        await selectedDevice.disconnect();
        setConnected(false);
        setSelectedDevice(null);
        setReceivedData("");
        setParsedData(null);
        console.log('🔌 Dispositivo desconectado');
      }
    } catch (error) {
      console.error('Error desconectando:', error);
    }
  };

  // Conexión automática cuando se carga busData
  useEffect(() => {
    const setupBluetoothConnection = async () => {
      // Solo conectar Bluetooth si el fiscal tiene sethora habilitado
      if (user?.sethora && busData && busData.numero && busData._id) {
        // Desconectar dispositivo anterior si existe
        if (selectedDevice && connected) {
          console.log('🔌 Desconectando dispositivo anterior...');
          await disconnectDevice();
        }

        const deviceName = `Unidad_${busData.numero}`;
        const key = busData._id;
        scanAndConnectToDevice(deviceName, key);
      } else if (!user?.sethora && (selectedDevice || connected)) {
        // Si sethora es false y hay una conexión activa, desconectarla
        console.log('🔌 Desconectando Bluetooth (sethora deshabilitado)...');
        await disconnectDevice();
        setPCounter(null);
        setBtStatusMessage("");
      }
    };

    setupBluetoothConnection();

    // Cleanup al desmontar
    return () => {
      if (selectedDevice && connected) {
        disconnectDevice();
      }
    };
  }, [busData?._id, user?.sethora]); // Solo reaccionar cuando cambie el _id del bus o sethora

  // ==================== END BLUETOOTH CLASSIC FUNCTIONS ====================

  //petición de la cola hacia el servidor

  // arreglar enviar arreglo en vez de individualmente

  //
  const sendQueueRequest = async (request: RequestData) => {
    try {
      const response = await axios.post(`${url}/api/app/timestamp`, request);

      if (
        response.status === 200 ||
        response.status === 201 ||
        response.status === 202
      ) {
        return { success: true }; // Indicar que la petición se envió correctamente
      }
      return { success: false };
    } catch (error) {
      console.log(error);
      return { success: false }; // Indicar que la petición no se envió correctamente
    }
  };
  //
  //petición normal hacia el servidor
  const sendRequest = async (request: RequestData, isQueued = false) => {
    setIsSubmitting(true);
    try {
      const response: any = await Promise.race([
        axios.post(`${url}/api/app/timestamp`, request),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 20000)
        ),
      ]);

      if (response.status === 201) {
        {
          response.data.delay == 1
            ? alert(`La unidad tiene ${response.data.delay} minuto de retraso`)
            : alert(
              `La unidad tiene ${response.data.delay} minutos de retraso`
            );
        }
        console.log(response.data.delay);
        return true;
      }

      if (response.status === 200) {
        alert("Datos enviados correctamente");
        // setTimeout(() => alert(''), 3000);
        return true; // Indicar que la petición se envió correctamente
      }
      if (response.status == 202) {
        alert("La unidad no tiene ruta asignada");
        return true; // Indicar que la petición se envió correctamente
      }
      return false;
    } catch (error) {
      console.log(error + " error");
      // setTimeout(() => alert(''), 3000);
      return false; // Indicar que la petición se agregó a la cola
    }
  };

  //
  // función para manejar el envío de datos
  const handleSubmit = async () => {
    if (isSubmitting) return;
    // siempre requerir unidad
    if (!busData) {
      alert("Debes seleccionar un autobús");
      return;
    }
    // si el admin habilitó selección de ruta (setruta) o el fiscal debe marcar salida (sethora), entonces la ruta es obligatoria
    if ((user?.setruta || user?.sethora) && !selectedRuta) {
      alert("Debes seleccionar ruta");
      return;
    }

    if (user?.sethora == false) {
      if (busData) {
        console.log(busData, selectedRuta, "datos del bus");
        setIsSubmitting(true); // Establecer isSubmitting a true al inicio
        try {
          const now = new Date();
          const year = now.getUTCFullYear();
          const month = String(now.getUTCMonth() + 1).padStart(2, "0");
          const day = String(now.getUTCDate()).padStart(2, "0");
          const hours = String(now.getUTCHours()).padStart(2, "0");
          const minutes = String(now.getUTCMinutes()).padStart(2, "0");
          const seconds = String(now.getUTCSeconds()).padStart(2, "0");
          const milliseconds = String(now.getUTCMilliseconds()).padStart(
            3,
            "0"
          );
          const utcDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;

          const request: RequestData = {
            id_ruta: selectedRuta,
            id_unidad: busData._id,
            timestamp_telefono: utcDate,
            timestamp_salida: selectedTime,
            id_fiscal: user?._id || "",
            passenger_count: null, // sethora es false, no hay contador
          };

          // Intentar enviar la petición
          // const sent = await sendRequest(request);

          // if (sent) {
          //   setSelectedRuta(null);
          //   setBusData(null);
          // } else {
          // Verificar si el registro ya existe en la cola
          const existsInQueue = busQueue.some(
            (item) =>
              item.id_unidad === request.id_unidad &&
              item.timestamp_salida === request.timestamp_salida
          );

          if (!existsInQueue) {
            // alert("La petición se agregó a la cola");

            setBusQueue([...busQueue, request]);
          }

          setSelectedRuta(null);
          setBusData(null);
          setPCounter(null);
          setBtStatusMessage("");
          // }
        } finally {
          setIsSubmitting(false); // Establecer isSubmitting a false al final
        }
      } else {
        alert("Debes seleccionar ruta y autobús");
      }
    } else {
      if (selectedRuta && busData) {
        console.log(busData, selectedRuta, "datos del bus");
        setIsSubmitting(true); // Establecer isSubmitting a true al inicio
        try {
          const now = new Date();
          const year = now.getUTCFullYear();
          const month = String(now.getUTCMonth() + 1).padStart(2, "0");
          const day = String(now.getUTCDate()).padStart(2, "0");
          const hours = String(now.getUTCHours()).padStart(2, "0");
          const minutes = String(now.getUTCMinutes()).padStart(2, "0");
          const seconds = String(now.getUTCSeconds()).padStart(2, "0");
          const milliseconds = String(now.getUTCMilliseconds()).padStart(
            3,
            "0"
          );
          const utcDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;

          const request: RequestData = {
            id_ruta: selectedRuta,
            id_unidad: busData._id,
            timestamp_telefono: utcDate,
            timestamp_salida: selectedTime,
            id_fiscal: user?._id || "",
            passenger_count: user?.sethora ? pCounter : null, // Solo enviar pCounter si sethora es true
          };

          // Intentar enviar la petición
          // const sent = await sendRequest(request);

          // if (sent) {
          //   setSelectedRuta(null);
          //   setBusData(null);
          // } else {
          // Verificar si el registro ya existe en la cola
          const existsInQueue = busQueue.some(
            (item) =>
              item.id_unidad === request.id_unidad &&
              item.timestamp_salida === request.timestamp_salida
          );

          if (!existsInQueue) {
            // alert("La petición se agregó a la cola");
            setBusQueue([...busQueue, request]);
          }

          setSelectedRuta(null);
          setBusData(null);
          setPCounter(null);
          setBtStatusMessage("");
          // }
        } finally {
          setIsSubmitting(false); // Establecer isSubmitting a false al final
        }
      } else {
        alert("Debes seleccionar ruta y autobús");
      }
    }
  };
  //
  // Procesar la cola de peticiones pendientes cada 10 segundos si hay conexión a internet y la cola no está vacía
  useEffect(() => {
    const processQueue = async () => {
      if (showTimePicker || isProcessingQueue || busQueue.length === 0) return;
      setIsProcessingQueue(true);

      const updatedQueue = [...busQueue]; // Copia de la cola actual
      const failedRequests: RequestData[] = []; // Lista para almacenar las peticiones fallidas

      for (let i = 0; i < updatedQueue.length; i++) {
        const nextRequest = updatedQueue[i];
        const bus = busList.find(
          (b) => b._id === nextRequest.id_unidad
        )?.numero;

        const result = await sendQueueRequest(nextRequest);

        if (result.success) {
          console.log("Se envió la unidad: ", bus);
        } else {
          console.log("Fallo en el envío de la unidad: ", bus);
          failedRequests.push(nextRequest); // Agregar a la lista de fallidos
        }
      }

      // Actualizar la cola con las peticiones fallidas
      setBusQueue(failedRequests);
      setIsProcessingQueue(false);

      if (failedRequests.length === 0) {
        alert("Datos enviados correctamente");
        console.log("Todos los datos de la cola se enviaron correctamente");
        // Actualizar registros después de enviar exitosamente a la BD
        // Pequeño delay para asegurar que el servidor haya procesado la petición
        setTimeout(async () => {
          await fetchRegistros();
        }, 500);
      }
    };

    if (busQueue.length > 0 && !isProcessingQueue && !showTimePicker) {
      console.log(busQueue, "datos de la cola", busQueue.length);
      processQueue();
    }
  }, [busQueue, isProcessingQueue]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setConnection(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, [setConnection]);

  //
  // Función para manejar el cambio de hora
  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || selectedTime;
    setShowTimePicker(false);
    setSelectedTime(currentDate);
    setSelectedRealTime(currentDate);
  };

  const formatDate1 = (dateString: string | Date) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const secs = String(date.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strHours = String(hours).padStart(2, "0");
    return `${strHours}:${minutes} ${ampm}`;
  };

  return (
    <Screen>
      <View className="flex flex-col items-center justify-center">
        <Text className="text-2xl text-white">Bienvenido Fiscal {user?.numero}</Text>
        <Link asChild href="/scanqr">
          <Pressable className="bg-light-success p-2 m-4 rounded">
            <Text className="text-xl font-bold text-light-text">Escánea el Código QR </Text>
          </Pressable>
        </Link>
      </View>

      {busData && (
        <View className="mt-6 p-4">
          <View className="flex items-center justify-center">
            <Text className="text-light-text mb-2 mx-4 text-lg text-white">
              <Text className="font-bold text-light-success">Unidad: </Text>
              {busData.numero}
            </Text>
          </View>
          <>
            {user?.sethora && btStatusMessage && (
              <View className={`m-3 p-3 rounded ${btStatusMessage.includes("correctamente")
                ? "bg-green-100"
                : "bg-red-100"
                }`}>
                <Text className={`text-center ${btStatusMessage.includes("correctamente")
                  ? "text-green-800"
                  : "text-red-800"
                  }`}>
                  {btStatusMessage}
                </Text>
              </View>
            )}
            {user?.sethora && btLoading && (
              <View className="m-3 p-3 rounded bg-blue-100">
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#1e40af" />
                  <Text className="text-blue-800 ml-2">Conectando con ESP32...</Text>
                </View>
              </View>
            )}
            {(user?.setruta || user?.sethora) && (
              <View className="m-3 bg-light-secondary rounded">
                <Picker
                  selectedValue={selectedRuta}
                  onValueChange={(itemValue, itemIndex) =>
                    setSelectedRuta(itemValue)
                  }
                >
                  <Picker.Item
                    key="none"
                    label="Selecciona una Ruta"
                    value={null}
                  />
                  {rutas.map((r) => (
                    <Picker.Item key={r._id} label={r.nombre} value={r._id} />
                  ))}
                </Picker>
              </View>
            )}

            {user?.sethora ? (
              <View>
                <Pressable
                  className="p-4 mt-10 bg-light-secondary rounded items-center justify-center border-slate-800 border-2"
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text className="text-lg font-bold">
                    Hora de Salida: {selectedRealTime ? formatDate1(selectedRealTime) : "Seleccionar"}
                  </Text>
                </Pressable>
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                  />
                )}
              </View>
            ) : null}
          </>
          {isSubmitting ? (
            <View className="p-3 mt-10 bg-light-secondary rounded items-center justify-center border-slate-800 border-2">
              <Text className="text-lg font-bold text-light-text">Enviando...</Text>
            </View>
          ) : (
            <Pressable
              onPress={() => handleSubmit()}
              className="p-3 mt-10 bg-light-success rounded items-center justify-center border-slate-800 border-2"
            >
              <Text className="text-lg font-bold text-white">Enviar Datos</Text>
            </Pressable>
          )}
        </View>
      )}

      {user?.sethora ? (
        <View className="m-6">
          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : getRegistros.length > 0 ? (
            <View className="mt-6 p-4">
              {getRegistros.map((registro) => {
                const bus = busList.find(
                  (bus) => bus._id === registro.id_unidad
                );
                return (
                  <View
                    className="m-4 p-4 bg-white rounded "
                    key={registro._id}
                  >
                    <View className="flex flex-row justify-between">
                      <Text className="text-light-text mb-2 mx-4 text-lg">
                        <Text className="font-bold ">
                          Control:{" "}
                        </Text>
                        {bus ? bus.numero : "N/A"}
                      </Text>
                      {user.setdelete && (
                        <Pressable
                          onPress={() => deleteRegistro(registro._id)}
                        >
                          <DeleteIcon />
                        </Pressable>
                      )}
                    </View>
                    <Text className="text-light-text mb-2 mx-4 text-lg">
                      <Text className="font-bold text-light-text">
                        Hora de salida:{" "}
                      </Text>
                      {formatDate1(registro.timestamp_salida)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="text-white">No hay registros disponibles</Text>
          )}
        </View>
      ) : (
        ""
      )}

    </Screen>
  );
}
