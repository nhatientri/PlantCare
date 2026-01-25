#include "ConfigManager.h"

void ConfigManager::begin() {
    preferences.begin(NAMESPACE, false); // false = read/write
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
