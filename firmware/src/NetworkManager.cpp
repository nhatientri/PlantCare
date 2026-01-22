#include "NetworkManager.h"

NetworkManager* NetworkManager::_instance = nullptr;

NetworkManager::NetworkManager() : _mqttClient(_espClient) {
}

NetworkManager* NetworkManager::getInstance() {
    if (!_instance) {
        _instance = new NetworkManager();
    }
    return _instance;
}

void NetworkManager::setup() {
    // 1. Connect to WiFi using WiFiManager (NON-BLOCKING)
    // This ensures we can water the plants even if WiFi is down!
    
    // Make Config Portal Non-Blocking: main loop continues running while AP is up
    _wifiManager.setConfigPortalBlocking(false);
    
    // Set timeout for the connection attempt itself (not the portal)
    _wifiManager.setConnectTimeout(20); 

    // AutoConnect will try to connect. If it fails, it starts the AP and returns.
    // It returns true if connected, false if started AP.
    if(_wifiManager.autoConnect("PlantCare-Setup", "plantcare123")) {
        Serial.println("WiFi connected");
        Serial.println("IP address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("WiFi connection failed. Running in Offline Mode (AP Active).");
    }

    // 2. Setup MQTT
    _mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
}

void NetworkManager::loop() {
    // Handle WiFi Portal requests (if AP is active)
    _wifiManager.process();

    if (!_mqttClient.connected()) {
        reconnect();
    }
    _mqttClient.loop();
}

void NetworkManager::setCallback(MqttCallback callback) {
    _mqttClient.setCallback(callback);
}

void NetworkManager::reconnect() {
    // Non-blocking reconnect strategy is better, but blocking is simpler for MVP
    // We'll do a simple check to avoid hanging the loop too long
    if (!_mqttClient.connected()) {
        Serial.print("Attempting MQTT connection...");
        
        if (_mqttClient.connect(DEVICE_ID)) {
            Serial.println("connected");
            _mqttClient.subscribe("plantcare/commands");
        } else {
            Serial.print("failed, rc=");
            Serial.print(_mqttClient.state());
            Serial.println(" try again in 5 seconds");
            // Wait 5 seconds? No, that blocks main loop. 
            // Better to just return and try next loop.
            // But we need to ensure we don't spam.
            delay(100); // Small delay
        }
    }
}

void NetworkManager::publish(const char* topic, const char* payload) {
    if (_mqttClient.connected()) {
        _mqttClient.publish(topic, payload);
    }
}

void NetworkManager::publishSensorData(int moisture, bool pumpStatus) {
    if (!_mqttClient.connected()) return;

    // Use JSON manually to avoid depending on ArduinoJson for just this if possible,
    // but platformio.ini has ArduinoJson so let's use it for safety/cleanliness?
    // Actually simpler to just snprintf for small string.
    char msg[128];
    snprintf(msg, 128, "{\"deviceId\":\"%s\", \"moisture\":%d, \"pump\":%s}", 
             DEVICE_ID, moisture, pumpStatus ? "true" : "false");
             
    _mqttClient.publish("plantcare/readings", msg);
}

bool NetworkManager::isConnected() {
    return _mqttClient.connected();
}
