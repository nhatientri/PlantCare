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

// -- Time Windows --

int ConfigManager::loadMorningStart() {
    return preferences.getInt("m_start", 6);
}

void ConfigManager::saveMorningStart(int hour) {
    preferences.putInt("m_start", hour);
}

int ConfigManager::loadMorningEnd() {
    return preferences.getInt("m_end", 10);
}

void ConfigManager::saveMorningEnd(int hour) {
    preferences.putInt("m_end", hour);
}

int ConfigManager::loadAfternoonStart() {
    return preferences.getInt("a_start", 16);
}

void ConfigManager::saveAfternoonStart(int hour) {
    preferences.putInt("a_start", hour);
}

int ConfigManager::loadAfternoonEnd() {
    return preferences.getInt("a_end", 19);
}

void ConfigManager::saveAfternoonEnd(int hour) {
    preferences.putInt("a_end", hour);
}

// -- Trigger Mode --

int ConfigManager::loadTriggerMode() {
    return preferences.getInt("trig_mode", 0); // Default 0 (Average)
}

void ConfigManager::saveTriggerMode(int mode) {
    preferences.putInt("trig_mode", mode);
}
