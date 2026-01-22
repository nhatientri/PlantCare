#ifndef CONFIG_H
#define CONFIG_H

// WiFi Credentials - Managed by WiFiManager
// #define WIFI_SSID "..."  <-- Removed
// #define WIFI_PASS "..."  <-- Removed

// Backend Server
// Backend Server
#include "Secrets.h"

// Backend Server
#define SERVER_URL "https://plantcare-tk1w.onrender.com/api/readings"

// MQTT Configuration
#define MQTT_SERVER MQTT_SERVER_SECURE
#define MQTT_PORT MQTT_PORT_SECURE
#define MQTT_USER MQTT_USER_SECURE
#define MQTT_PASS MQTT_PASS_SECURE
#define MQTT_TOPIC_COMMAND "plantcare/+/command"
#define MQTT_TOPIC_DATA "plantcare/readings"
#define MQTT_TOPIC_STATUS "plantcare/status"

#ifndef DEVICE_ID
#define DEVICE_ID "esp32-default"
#endif

#define DEVICE_SECRET DEVICE_SECRET_KEY

// OTA Updates
// OTA Updates
#define OTA_HOSTNAME "PlantCare-" DEVICE_ID
#define OTA_PASSWORD OTA_PASSWORD_SECURE

// Pin Definitions
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define PUMP_PIN 2      // Digital Output

// Moisture Sensors (List of Analog Pins only)
// Example: Two plants on pins 34 and 32
const int MOISTURE_PINS[] = {34, 32};
#define NUM_PLANTS (sizeof(MOISTURE_PINS) / sizeof(MOISTURE_PINS[0]))


// Calibration
#define MOISTURE_AIR 1700  // Dry sensor in air (use max of your sensors' air readings)
#define MOISTURE_WATER 700  // Sensor in wet soil (using 700 to cover both ~716 and ~836)
#define DEFAULT_MOISTURE_THRESHOLD 30 
extern int wateringThreshold; // Dynamic Variable

// Loop Timing
#define READ_INTERVAL 5000 // 5 seconds

// Watering Logic (Smart)
#define PUMP_BURST_MS 2000    // Water for 2 seconds
#define PUMP_SOAK_MS 30000    // Wait 30 seconds for water to soak
#define MAX_WATERING_CYCLES 3 // Max 3 bursts per session
#define MAX_DAILY_CYCLES 5    // Max 5 sessions per day (Safety)

// Sensor Safety
#define SENSOR_MIN_VALID 100  // Anything below this is "disconnected"
#define SENSOR_MAX_VALID 4000 // Anything above this is "shorted/error"

// Advanced Watering Logic
#define SAFE_MAX_MOISTURE 85  // If any plant is > 85%, DO NOT water (Safety)
#define TANK_CHECK_TOLERANCE 2 // Moisture must increase by > 2% to prove water flowed
#define MOISTURE_RECOVERY_RISE 5 // Increase > 5% clears "Tank Empty" alert
#define MAX_TANK_FAILURES 2    // 2 failed attempts = Tank Empty

// Time & Schedule (NTP)
#define NTP_SERVER "pool.ntp.org"
#define GMT_OFFSET_SEC 25200 // UTC+7 (Vietnam)
#define DST_OFFSET_SEC 0
#define START_HOUR 6  // 6:00 AM
#define END_HOUR 22   // 10:00 PM

#endif
