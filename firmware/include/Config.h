#ifndef CONFIG_H
#define CONFIG_H

// WiFi Credentials
#define WIFI_SSID "P5-12B01"
#define WIFI_PASS "muvodich"

// Backend Server
// Backend Server
#define SERVER_URL "https://plantcare-tk1w.onrender.com/api/readings"

// MQTT Configuration
#define MQTT_SERVER "broker.emqx.io"
#define MQTT_PORT 1883
#define MQTT_USER "" // Empty for public broker
#define MQTT_PASS ""
#define MQTT_TOPIC_COMMAND "plantcare/+/command" // + is wildcard for device_id
#define MQTT_TOPIC_DATA "plantcare/readings"

#ifndef DEVICE_ID
#define DEVICE_ID "esp32-default" // Fallback
#endif

// Pin Definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define PUMP_PIN 2      // Digital Output

// Moisture Sensors (List of Analog Pins only)
// Example: Two plants on pins 34 and 35
const int MOISTURE_PINS[] = {34, 35};
#define NUM_PLANTS (sizeof(MOISTURE_PINS) / sizeof(MOISTURE_PINS[0]))


// Calibration
#define MOISTURE_AIR 2600
#define MOISTURE_WATER 1000
#define MOISTURE_THRESHOLD 30 // Threshold for ANY plant to trigger pump

// Loop Timing
#define READ_INTERVAL 5000 // 5 seconds

// Time & Schedule (NTP)
#define NTP_SERVER "pool.ntp.org"
#define GMT_OFFSET_SEC 25200 // UTC+7 (Vietnam)
#define DST_OFFSET_SEC 0
#define START_HOUR 6  // 6:00 AM
#define END_HOUR 22   // 10:00 PM

#endif
