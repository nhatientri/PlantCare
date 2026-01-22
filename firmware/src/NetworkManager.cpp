#include "NetworkManager.h"
#include <WiFiManager.h>
#include <ArduinoOTA.h>

NetworkManager::NetworkManager() : client(espClient) {
}

void NetworkManager::setup(MqttCallback callback) {
    // 1. WiFiManager Setup
    WiFiManager wifiManager;
    // wifiManager.setDebugOutput(false); // Optional
    String apName = "PlantCare-" + String(DEVICE_ID);
    
    if (!wifiManager.autoConnect(apName.c_str())) {
        Serial.println("WiFiManager failed to connect and hit timeout. Restarting...");
        ESP.restart();
        delay(1000);
    }

    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    // 2. Setup OTA
    setupOTA();

    // 3. MQTT Setup
    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(callback);
}

void NetworkManager::loop() {
    // Handle OTA
    ArduinoOTA.handle();

    if (!client.connected()) {
        reconnect();
    }
    client.loop();
}

void NetworkManager::setupOTA() {
    ArduinoOTA.setHostname(OTA_HOSTNAME);
    ArduinoOTA.setPassword(OTA_PASSWORD);

    ArduinoOTA.onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH)
            type = "sketch";
        else // U_SPIFFS
            type = "filesystem";
        Serial.println("Start updating " + type);
    });
    
    ArduinoOTA.onEnd([]() {
        Serial.println("\nEnd");
    });
    
    ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
    });
    
    ArduinoOTA.onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
    });

    ArduinoOTA.begin();
    Serial.println("OTA Ready");
}

void NetworkManager::publish(const char* topic, const char* payload) {
    client.publish(topic, payload);
}

bool NetworkManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void NetworkManager::reconnect() {
    // Non-blocking Reconnect
    unsigned long now = millis();
    if (now - lastReconnectAttempt < 5000) {
        return; // Wait 5 seconds before retrying
    }
    lastReconnectAttempt = now;

    if (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        String clientId = DEVICE_ID;
        clientId += String(random(0xffff), HEX);

        // Prepare Last Will and Testament (LWT) message
        String statusTopic = String(MQTT_TOPIC_STATUS) + "/" + String(DEVICE_ID);
        String willMessage = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",\"status\":\"offline\"}";

        bool connected = false;
        if (String(MQTT_USER) == "") {
            // Connect with LWT: topic, QoS, retain, message
            connected = client.connect(clientId.c_str(), statusTopic.c_str(), 1, true, willMessage.c_str());
        } else {
            // Connect with username/password and LWT
            connected = client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS, 
                                     statusTopic.c_str(), 1, true, willMessage.c_str());
        }

        if (connected) {
            Serial.println("connected");
            
            // Publish online status immediately after connecting
            String onlineMessage = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",\"status\":\"online\"}";
            client.publish(statusTopic.c_str(), onlineMessage.c_str(), true);
            
            // Subscribe to command topics
            String topic = "plantcare/" + String(DEVICE_ID) + "/command";
            client.subscribe(topic.c_str());
            // client.subscribe(MQTT_TOPIC_COMMAND); // Removed wildcard subscription to prevent cross-talk 
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            // Do NOT delay here. Just return and let loop continue.
        }
    }
}
