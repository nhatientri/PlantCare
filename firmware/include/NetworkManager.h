#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include "Config.h"

// Callback signature for MQTT messages
typedef void (*MqttCallback)(char*, byte*, unsigned int);

class NetworkManager {
public:
    NetworkManager();
    void setup(MqttCallback callback);
    void loop();
    bool isConnected();
    void publish(const char* topic, const char* payload);

private:
    WiFiClient espClient;
    PubSubClient client;
    
    void reconnect();
    void setupOTA(); // Internal helper

    unsigned long lastReconnectAttempt = 0;
};

#endif
