import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

/**
 * Hook personalizado para gestionar permisos de Bluetooth
 * Compatible con Android 12+ y versiones anteriores
 * 
 * @returns {Object} - Estado de permisos y función para solicitarlos
 */
export const useBlePermissions = () => {
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkPermissions();
  }, []);

  /**
   * Verifica si los permisos ya fueron otorgados
   */
  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;

      try {
        if (apiLevel >= 31) {
          // Android 12+ (API 31+)
          const scanGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN
          );
          const connectGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );

          setPermissionsGranted(scanGranted && connectGranted);
        } else {
          // Android 11 y anteriores
          const locationGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );

          setPermissionsGranted(locationGranted);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
        setPermissionsGranted(false);
      }
    } else {
      // iOS - los permisos se manejan automáticamente
      setPermissionsGranted(true);
    }

    setIsChecking(false);
  };

  /**
   * Solicita los permisos necesarios de Bluetooth
   */
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;

      try {
        if (apiLevel >= 31) {
          // Android 12+ (API 31+)
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const allGranted = 
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
            granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

          setPermissionsGranted(allGranted);

          if (!allGranted) {
            Alert.alert(
              'Permisos Requeridos',
              'Esta aplicación necesita permisos de Bluetooth y ubicación para escanear dispositivos.',
              [{ text: 'OK' }]
            );
          }

          return allGranted;
        } else {
          // Android 11 y anteriores
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);

          const allGranted = 
            granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
            granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

          setPermissionsGranted(allGranted);

          if (!allGranted) {
            Alert.alert(
              'Permisos Requeridos',
              'Esta aplicación necesita permisos de ubicación para escanear dispositivos Bluetooth.',
              [{ text: 'OK' }]
            );
          }

          return allGranted;
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert(
          'Error',
          'No se pudieron solicitar los permisos. Por favor, verifica la configuración de la aplicación.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }

    // iOS
    return true;
  };

  return {
    permissionsGranted,
    isChecking,
    requestPermissions,
    checkPermissions,
  };
};
