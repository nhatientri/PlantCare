#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <PubSubClient.h>
#include <WiFiManager.h> // https://github.com/tzapu/WiFiManager
#include "Config.h"

// Callback type for incoming messages
typedef void (*MqttCallback)(char* topic, byte* payload, unsigned int length);

class NetworkManager {
private:
    WiFiClient _espClient;
    PubSubClient _mqttClient;
    WiFiManager _wifiManager; // Member variable for persistence
    
    // Singleton instance
    static NetworkManager* _instance;
    
    // Private constructor
    NetworkManager();
    
    void reconnect();

public:
    static NetworkManager* getInstance();
    
    void setup();
    void loop();
    
    void setCallback(MqttCallback callback);
    
    void publish(const char* topic, const char* payload);
    void publishSensorData(int moisture, bool pumpStatus);
    
    bool isConnected();
};

#endif
