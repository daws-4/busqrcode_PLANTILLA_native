#include <BluetoothSerial.h> 
#include <ArduinoJson.h>
#include <SevSeg.h>

SevSeg sevseg;
BluetoothSerial ESP_BT;

// Pines a conectar
const int sensorPIN1 = 34; 
const int sensorPIN2 = 35; 
const int buzzerPin = 14;
const int laser1 = 12;
const int laser2 = 25; 

// Variables para el funcionamiento del contador
int threshold = 500;
int counter = 0;
const int MAX_COUNT = 999; 
bool ldr1Oscuro = false;
bool ldr2Oscuro = false; 
bool secuenciaCorrecta = false;
bool secuenciaIncorrectaPrevia = false; 
unsigned long tiempoLaserApagado = 0;
bool laser1Apagado = false; 
const unsigned long tiempoEsperaLaser = 4000; // 4 segundos de espera para el láser

// Variables para el debounce (comentadas en el loop)
int lastButtonState = HIGH;
int currentButtonState;
unsigned long lastDebounceTime = 0; 
const unsigned long debounceDelay = 50; 

String mensaje = "Ingrese el PIN";
String input;
// Contraseña alfanumérica
String password = "68c87fe7069f2f93dd7481f4"; 
bool authenticated = false; // Variable para controlar el estado de autenticación

// NUEVAS VARIABLES PARA ALARMA DE OBSTRUCCIÓN (6 segundos)
unsigned long tiempoInicioObstruccion1 = 0; 
unsigned long tiempoInicioObstruccion2 = 0; 
const unsigned long tiempoLimiteAlarma = 6000; // 6 segundos para la alarma
bool alarmaActiva = false; 


void setup() {
  // ESP32 PINES para el display de 7 segmentos
  byte segmentPins[] = {16, 17, 18, 19, 21, 22, 23};
  byte digitPins[] = {26, 27, 33}; 
  
  sevseg.begin(COMMON_CATHODE, 3, digitPins, segmentPins, false);
  sevseg.setBrightness(90);

  pinMode(sensorPIN1, INPUT);
  pinMode(sensorPIN2, INPUT);
  pinMode(buzzerPin, OUTPUT);
  pinMode(laser1, OUTPUT); 
  pinMode(laser2, OUTPUT); 
  
  digitalWrite(laser1, HIGH);
  digitalWrite(laser2, HIGH);

  Serial.begin(115200);
  if (!ESP_BT.begin("Unidad_1"))
  {
    Serial.println("Error al inicializar Bluetooth");
    return; 
  }
}

void loop() {
  // Lógica de detección de botón y contador (SIEMPRE ACTIVA)
  JsonDocument doc;
  doc["conteo"] = counter; 
  doc["Unidad 1"] = "68c87fe7069f2f93dd7481f4";
  
  // Leer los valores de los LDRs
  int sensorValue1 = analogRead(sensorPIN1); 
  int sensorValue2 = analogRead(sensorPIN2); 

  // Verificar la activación de los LDRs
  bool nuevoLDR1Oscuro = sensorValue1 < threshold; 
  bool nuevoLDR2Oscuro = sensorValue2 < threshold; 

  // ====================================================
  // >>> LÓGICA DE ALARMA POR OBSTRUCCIÓN PROLONGADA (6s) <<<
  // ====================================================

  // 1. Monitoreo del LDR1
  if (nuevoLDR1Oscuro) {
    if (tiempoInicioObstruccion1 == 0) {
      tiempoInicioObstruccion1 = millis();
    }
  } else {
    tiempoInicioObstruccion1 = 0;
  }

  // 2. Monitoreo del LDR2
  if (nuevoLDR2Oscuro) {
    if (tiempoInicioObstruccion2 == 0) {
      tiempoInicioObstruccion2 = millis();
    }
  } else {
    tiempoInicioObstruccion2 = 0;
  }

  // 3. Verificación y Control de la Alarma (6 segundos)
  if ((tiempoInicioObstruccion1 != 0 && (millis() - tiempoInicioObstruccion1) > tiempoLimiteAlarma) ||
      (tiempoInicioObstruccion2 != 0 && (millis() - tiempoInicioObstruccion2) > tiempoLimiteAlarma)) 
  {
    if (!alarmaActiva) {
      digitalWrite(buzzerPin, HIGH); 
      alarmaActiva = true;
      Serial.println("!!! ALARMA DE OBSTRUCCIÓN PROLONGADA ACTIVA (LDR1 o LDR2) !!!");
    }
  } else {
    if (alarmaActiva) {
      digitalWrite(buzzerPin, LOW);
      alarmaActiva = false;
      Serial.println("Alarma desactivada. Obstrucción eliminada.");
    }
  }

  // ====================================================
  // >>> CONTROL DEL LÁSER Y LÓGICA DE CONTEO <<<
  // ====================================================

  // Control del láser apagado (Esto permite que el láser se encienda a los 4s)
  if (laser1Apagado && (millis() - tiempoLaserApagado > tiempoEsperaLaser)) 
  {
    digitalWrite(laser1, HIGH); 
    laser1Apagado = false;
    Serial.println("Laser 1 encendido."); 
  }

  // Lógica de detección de secuencia para subir...
  if (nuevoLDR1Oscuro && !ldr1Oscuro && !ldr2Oscuro && !secuenciaIncorrectaPrevia && !laser1Apagado) 
  {
    ldr1Oscuro = true;
    secuenciaCorrecta = true;
    Serial.println("LDR1 oscurecido (subiendo).");
  } 
  else if (nuevoLDR2Oscuro && ldr1Oscuro && !ldr2Oscuro && secuenciaCorrecta) 
  {
    ldr2Oscuro = true;
    Serial.println("LDR2 oscurecido (subiendo)."); 
  }

  // Verificar si ambos LDRs están iluminados y la secuencia fue correcta (subiendo)...
  if (!nuevoLDR1Oscuro && !nuevoLDR2Oscuro && ldr1Oscuro && ldr2Oscuro && secuenciaCorrecta) 
  {
    counter++;
    Serial.print("Pasajero subió. Contador: ");
    Serial.println(counter);

    // Activar el zumbador y el LED (Nota: Esto usa un delay bloqueante)
    digitalWrite(buzzerPin, HIGH);
    delay(500);
    digitalWrite(buzzerPin, LOW); 
    
    // Reiniciar los estados y la secuencia
    ldr1Oscuro = false;
    ldr2Oscuro = false;
    secuenciaCorrecta = false;
    secuenciaIncorrectaPrevia = false; 
    Serial.println("Sistema reiniciado."); 
  }

  // Reiniciar los estados si se detecta una secuencia incorrecta (bajando o ruido)...
  if (nuevoLDR2Oscuro && !ldr1Oscuro) 
  {
    ldr1Oscuro = false;
    ldr2Oscuro = false;
    secuenciaCorrecta = false;
    secuenciaIncorrectaPrevia = true; 
    digitalWrite(laser1, LOW); 
    laser1Apagado = true;
    tiempoLaserApagado = millis();
    Serial.println("LDR2 oscurecido primero (bajando o ruido). Laser 1 apagado."); 
  }
  
  // ====================================================
  // >>> LÓGICA DE REINICIO DE FLUJO CORREGIDA <<<
  // ====================================================

  // 1. Resetea la bandera si ambos LDRs están iluminados (i.e., el láser ya se encendió).
  if (secuenciaIncorrectaPrevia) 
  {
      if (!nuevoLDR1Oscuro && !nuevoLDR2Oscuro) 
      {
        secuenciaIncorrectaPrevia = false; 
        Serial.println("Secuencia incorrecta reseteada. Sistema en espera.");
      }
      
      // 2. Si la bandera sigue activa (esperando a que se cumplan los 4s o el reseteo),
      //    bloquea la ejecución del Bluetooth y el display de 7 segmentos.
      if (secuenciaIncorrectaPrevia) 
      {
        return; 
      }
  }

  // ====================================================
  // >>> LÓGICA BLUETOOTH <<<
  // ====================================================
  
  // Lógica para Bluetooth y contraseña...
  if (ESP_BT.available())
  {
    ESP_BT.println(mensaje); 
    input = ESP_BT.readStringUntil('\n');
    input.trim();
    
    if (input.equals(password))
    {
        authenticated = true; 
        ESP_BT.println("PIN CORRECTO");
        ESP_BT.print("Pasajeros del dia: ");
        ESP_BT.println(counter);
        serializeJsonPretty(doc, ESP_BT);
        ESP_BT.println();
    }
    else
    {
        ESP_BT.println("PIN INCORRECTO");
        authenticated = false; 
    }
    return;
  }

  // Refresca el display de 7 segmentos (SIEMPRE ACTIVO)
  sevseg.setNumber(counter, 0);
  sevseg.refreshDisplay();
}