#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// --- Hardware Pins ---
// Capacitive Soil Moisture Sensor (Analog)
#define PIN_SOIL_SENSOR 34 

// DHT22 Sensor (Digital)
#define PIN_DHT_SENSOR 4

// Relay Module (Digital Output)
#define PIN_PUMP_RELAY 26

// Status LED (Optional, using onboard LED for now)
#define PIN_STATUS_LED 2

// --- Sensor Calibration ---
// Calibrate these values by reading the sensor in Air (Dry) and Water (Wet)
const int SENSOR_AIR_VALUE = 4095;   // Reading in air (dry)
const int SENSOR_WATER_VALUE = 1800; // Reading in water (wet)

// --- Pump Settings ---
const unsigned long PUMP_BURST_DURATION_MS = 2000; // 2 Seconds
const unsigned long PUMP_SOAK_DURATION_MS = 30000; // 30 Seconds
const unsigned long MAX_PUMP_RUNTIME_MS = 10000;   // Safety: Max 10s continuous

// --- Water Tank Check ---
const int TANK_CHECK_TOLERANCE_PERCENT = 2; // Moisture must rise by 2% to confirm water flow

// --- Default Logic Settings ---
const int DEFAULT_MOISTURE_THRESHOLD = 30; // 30%
const int MAX_SAFE_MOISTURE = 85;          // 85% (Prevent flooding)

// --- WiFi & MQTT ---
// WiFi is replaced by WiFiManager (Captive Portal)
// MQTT settings can be overridden by platformio.ini

#ifndef MQTT_SERVER
#define MQTT_SERVER "broker.emqx.io"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

#ifndef DEVICE_ID
#define DEVICE_ID "esp32-default"
#endif

#endif // CONFIG_H
