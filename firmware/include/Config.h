#ifndef CONFIG_H
#define CONFIG_H

// WiFi Credentials
#define WIFI_SSID "P5-12B01"
#define WIFI_PASS "muvodich"

// Backend Server
#define SERVER_URL "http://192.168.1.11:3001/api/readings"
#define DEVICE_ID "esp32-living-room" // Unique ID for this device

// Pin Definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define PUMP_PIN 5      // Digital Output

// Moisture Sensors (List of Analog Pins only)
// Example: Two plants on pins 34 and 35
const int MOISTURE_PINS[] = {34, 35};
#define NUM_PLANTS (sizeof(MOISTURE_PINS) / sizeof(MOISTURE_PINS[0]))


// Calibration
#define MOISTURE_AIR 4095
#define MOISTURE_WATER 0
#define MOISTURE_THRESHOLD 30 // Threshold for ANY plant to trigger pump

// Loop Timing
#define READ_INTERVAL 5000 // 5 seconds

#endif
