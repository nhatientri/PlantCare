#include "NetworkManager.h"

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

    // 2. MQTT Setup
    client.setServer(MQTT_SERVER, MQTT_PORT);
    client.setCallback(callback);
}

void NetworkManager::loop() {
    if (!client.connected()) {
        reconnect();
    }
    client.loop();
}

void NetworkManager::publish(const char* topic, const char* payload) {
    client.publish(topic, payload);
}

bool NetworkManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void NetworkManager::reconnect() {
    // Loop until we're reconnected
    // Note: This is blocking, consistent with original logic for simplicity,
    // but ideally should be non-blocking in future iterations.
    while (!client.connected()) {
        Serial.print("Attempting MQTT connection...");
        String clientId = DEVICE_ID;
        clientId += String(random(0xffff), HEX);

        bool connected = false;
        if (String(MQTT_USER) == "") {
            connected = client.connect(clientId.c_str());
        } else {
            connected = client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
        }

        if (connected) {
            Serial.println("connected");
            String topic = "plantcare/" + String(DEVICE_ID) + "/command";
            client.subscribe(topic.c_str());
            client.subscribe(MQTT_TOPIC_COMMAND); 
        } else {
            Serial.print("failed, rc=");
            Serial.print(client.state());
            Serial.println(" try again in 5 seconds");
            delay(5000); 
        }
    }
}
