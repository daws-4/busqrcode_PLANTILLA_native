import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { useBlePermissions } from '@/hooks/useBlePermissions';

/**
 * Ejemplo de uso del hook useBlePermissions con react-native-ble-manager
 * 
 * Este componente demuestra cómo:
 * 1. Solicitar permisos de Bluetooth
 * 2. Inicializar BleManager
 * 3. Escanear dispositivos BLE
 */
export default function BleExample() {
    const { permissionsGranted, isChecking, requestPermissions } = useBlePermissions();

    useEffect(() => {
        // Inicializar BLE Manager cuando los permisos estén otorgados
        if (permissionsGranted) {
            initializeBle();
        }
    }, [permissionsGranted]);

    /**
     * Inicializa el módulo BLE Manager
     */
    const initializeBle = async () => {
        try {
            await BleManager.start({ showAlert: false });
            console.log('BLE Manager initialized');
        } catch (error) {
            console.error('BLE initialization error:', error);
            Alert.alert('Error', 'No se pudo inicializar el módulo Bluetooth');
        }
    };

    /**
     * Escanea dispositivos BLE cercanos
     */
    const startScan = async () => {
        if (!permissionsGranted) {
            const granted = await requestPermissions();
            if (!granted) {
                return;
            }
        }

        try {
            await BleManager.scan([], 5, true);
            Alert.alert('Escaneo Iniciado', 'Buscando dispositivos Bluetooth...');

            // Después de 5 segundos, detener el escaneo
            setTimeout(async () => {
                const peripherals = await BleManager.getDiscoveredPeripherals([]);
                console.log('Dispositivos encontrados:', peripherals);
                Alert.alert(
                    'Escaneo Completado',
                    `Se encontraron ${peripherals.length} dispositivos`
                );
            }, 5000);
        } catch (error) {
            console.error('Scan error:', error);
            Alert.alert('Error', 'No se pudo iniciar el escaneo de dispositivos');
        }
    };

    if (isChecking) {
        return (
            <View style={styles.container}>
                <Text>Verificando permisos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bluetooth Low Energy Demo</Text>

            {!permissionsGranted ? (
                <View style={styles.permissionsContainer}>
                    <Text style={styles.warningText}>⚠️ Permisos de Bluetooth requeridos</Text>
                    <Button
                        title="Solicitar Permisos"
                        onPress={requestPermissions}
                    />
                </View>
            ) : (
                <View style={styles.actionsContainer}>
                    <Text style={styles.successText}>✅ Permisos otorgados</Text>
                    <Button
                        title="Escanear Dispositivos BLE"
                        onPress={startScan}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    permissionsContainer: {
        alignItems: 'center',
        gap: 15,
    },
    actionsContainer: {
        alignItems: 'center',
        gap: 15,
    },
    warningText: {
        color: '#ff9800',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
    successText: {
        color: '#4caf50',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
    },
});
