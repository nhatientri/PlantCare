#include "ConfigManager.h"

void ConfigManager::begin() {
    preferences.begin(NAMESPACE, false); // false = read/write
    
    // Initialize defaults if missing to avoid NVS errors
    if (!preferences.isKey("password")) {
        preferences.putString("password", "admin123");
    }
    if (!preferences.isKey("threshold")) {
        preferences.putInt("threshold", 30);
    }
    if (!preferences.isKey("mqtt_server")) {
        preferences.putString("mqtt_server", "broker.hivemq.com");
    }
     if (!preferences.isKey("mqtt_port")) {
        preferences.putInt("mqtt_port", 1883);
    }
}

int ConfigManager::loadThreshold() {
    // Default to 30% if not set
    return preferences.getInt("threshold", 30);
}

void ConfigManager::saveThreshold(int threshold) {
    preferences.putInt("threshold", threshold);
}

String ConfigManager::loadMqttServer() {
    return preferences.getString("mqtt_server", "broker.hivemq.com");
}

void ConfigManager::saveMqttServer(String server) {
    preferences.putString("mqtt_server", server);
}

int ConfigManager::loadMqttPort() {
    return preferences.getInt("mqtt_port", 1883);
}

void ConfigManager::saveMqttPort(int port) {
    preferences.putInt("mqtt_port", port);
}

String ConfigManager::loadPassword() {
    return preferences.getString("password", "admin123");
}

void ConfigManager::savePassword(String password) {
    preferences.putString("password", password);
}

// -- Calibration --

int ConfigManager::loadAirValue(int index) {
    String key = "air" + String(index);
    return preferences.getInt(key.c_str(), DEFAULT_AIR);
}

void ConfigManager::saveAirValue(int index, int value) {
    String key = "air" + String(index);
    preferences.putInt(key.c_str(), value);
}

int ConfigManager::loadWaterValue(int index) {
    String key = "water" + String(index);
    return preferences.getInt(key.c_str(), DEFAULT_WATER);
}

void ConfigManager::saveWaterValue(int index, int value) {
    String key = "water" + String(index);
    preferences.putInt(key.c_str(), value);
}
