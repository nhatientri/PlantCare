#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFiManager.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include "ConfigManager.h"

class NetworkManager {
private:
    WiFiManager wm;
    WiFiClient espClient;
    PubSubClient client;
    ConfigManager* configManager;

    WiFiUDP ntpUDP;
    NTPClient* timeClient;
    
    char mqtt_server[40];
    char mqtt_port[6];
    
    unsigned long lastReconnectAttempt = 0;

    void reconnect();
    static void saveConfigCallback();

public:
    NetworkManager();
    void begin(ConfigManager* config);
    void loop();
    void publish(const char* topic, const char* payload);
    void setCallback(MQTT_CALLBACK_SIGNATURE);
    bool isConnected();
    int getHour();
    String getFormattedTime();
    
    // Helpers to avoid redundancy
    void getDeviceTopic(const char* suffix, char* buffer, size_t len);
    void publishDevice(const char* suffix, const char* payload);
};

#endif
