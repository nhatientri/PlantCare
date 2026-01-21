#ifndef SECRETS_H
#define SECRETS_H

// =========================================================
// SECURITY WARNING: NEVER COMMIT THIS FILE TO GIT!
// =========================================================

// WiFi Credentials (Fallback if WiFiManager fails/reset)
// #define WIFI_SSID_SECRET "MyWiFi"
// #define WIFI_PASS_SECRET "MyPassword"

// MQTT Broker Credentials
// RECOMMENDED: Use a private broker like HiveMQ Cloud!
#define MQTT_SERVER_SECURE "broker.emqx.io" // CHANGE THIS TO PRIVATE BROKER
#define MQTT_PORT_SECURE 1883
#define MQTT_USER_SECURE ""       // Add User
#define MQTT_PASS_SECURE ""       // Add Password

// Device Security
#define DEVICE_SECRET_KEY "change_me_to_random_string" 
#define OTA_PASSWORD_SECURE "admin"

#endif
