const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin para agregar permisos de Bluetooth necesarios para react-native-ble-manager
 * Configuración compatible con Android 12+ (API 31+) y versiones anteriores
 */
module.exports = function withAndroidBlePermissions(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Permisos necesarios para Bluetooth
    const permissions = [
      // Android 12+ (API 31+) - Nuevos permisos granulares
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_ADVERTISE',
      
      // Android 11 y anteriores - Permisos legacy
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      
      // Ubicación (necesario para BLE en todas las versiones)
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    // Crear el array de permisos si no existe
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    // Agregar cada permiso si no existe
    permissions.forEach((permission) => {
      const exists = androidManifest['uses-permission'].some(
        (p) => p.$['android:name'] === permission
      );

      if (!exists) {
        androidManifest['uses-permission'].push({
          $: {
            'android:name': permission,
          },
        });
      }
    });

    // Para BLUETOOTH_SCAN, añadir neverForLocation en Android 12+
    // Esto indica que no necesitamos información de ubicación del escaneo BLE
    const bluetoothScanIndex = androidManifest['uses-permission'].findIndex(
      (p) => p.$['android:name'] === 'android.permission.BLUETOOTH_SCAN'
    );

    if (bluetoothScanIndex !== -1) {
      androidManifest['uses-permission'][bluetoothScanIndex].$ = {
        ...androidManifest['uses-permission'][bluetoothScanIndex].$,
        'android:usesPermissionFlags': 'neverForLocation',
      };
    }

    // Declarar características de hardware Bluetooth
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }

    const bluetoothFeature = {
      $: {
        'android:name': 'android.hardware.bluetooth_le',
        'android:required': 'true',
      },
    };

    const featureExists = androidManifest['uses-feature'].some(
      (f) => f.$['android:name'] === 'android.hardware.bluetooth_le'
    );

    if (!featureExists) {
      androidManifest['uses-feature'].push(bluetoothFeature);
    }

    return config;
  });
};
