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
    void publish(const char* topic, const char* payload);
    bool isConnected();

private:
    WiFiClient espClient;
    PubSubClient client;
    void reconnect();
};

#endif
