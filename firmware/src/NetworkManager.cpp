#include "NetworkManager.h"

// Flag for saving data
bool shouldSaveConfig = false;

void NetworkManager::saveConfigCallback() {
    shouldSaveConfig = true;
}

void NetworkManager::setupOTA() {
    // Port defaults to 3232
    // ArduinoOTA.setPort(3232);

    // Hostname defaults to esp3232-[MAC]
    ArduinoOTA.setHostname(DEVICE_ID);

    // No authentication by default
    // ArduinoOTA.setPassword("admin");

    // Password can be set with it's md5 value as well
    // MD5(admin) = 21232f297a57a5a743894a0e4a801fc3
    // ArduinoOTA.setPasswordHash("21232f297a57a5a743894a0e4a801fc3");

    ArduinoOTA
        .onStart([this]() {
            this->otaInProgress = true;
            String type;
            if (ArduinoOTA.getCommand() == U_FLASH)
                type = "sketch";
            else // U_SPIFFS
                type = "filesystem";

            // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
            Serial.println("Start updating " + type);
        })
        .onEnd([this]() {
            this->otaInProgress = false;
            Serial.println("\nEnd");
        })
        .onProgress([](unsigned int progress, unsigned int total) {
            Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
        })
        .onError([this](ota_error_t error) {
            this->otaInProgress = false;
            Serial.printf("Error[%u]: ", error);
            if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
            else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
            else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
            else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
            else if (error == OTA_END_ERROR) Serial.println("End Failed");
        });

    ArduinoOTA.begin();
    Serial.println("OTA Initialized");
}

bool NetworkManager::isOTA() {
    return otaInProgress;
}

NetworkManager::NetworkManager() : client(espClient) {
    // UTC+7 = 7 * 3600 = 25200 seconds
    timeClient = new NTPClient(ntpUDP, "pool.ntp.org", 25200, 60000);
}

void NetworkManager::begin(ConfigManager* config) {
    configManager = config;
    
    // Start NTP moved to after WiFi
    // timeClient->begin();

    // Load MQTT config
    String server = configManager->loadMqttServer();
    String port = String(configManager->loadMqttPort());
    
    server.toCharArray(mqtt_server, 40);
    port.toCharArray(mqtt_port, 6);

    // WiFiManager Parameters
    WiFiManagerParameter custom_mqtt_server("server", "mqtt server", mqtt_server, 40);
    WiFiManagerParameter custom_mqtt_port("port", "mqtt port", mqtt_port, 6);

    wm.setSaveConfigCallback(saveConfigCallback);
    wm.addParameter(&custom_mqtt_server);
    wm.addParameter(&custom_mqtt_port);

    // Non-blocking
    wm.setConfigPortalBlocking(false);
    
    // Auto connect or start portal
    if(wm.autoConnect("PlantCare_AP")) {
        Serial.println("Connected to WiFi!");
    } else {
        Serial.println("Config Portal started...");
    }

    // Save params if updated
    if (shouldSaveConfig) {
        strcpy(mqtt_server, custom_mqtt_server.getValue());
        strcpy(mqtt_port, custom_mqtt_port.getValue());
        
        configManager->saveMqttServer(String(mqtt_server));
        configManager->saveMqttPort(atoi(mqtt_port));
    }

    // MQTT Setup
    client.setBufferSize(1024); // Support large JSON payloads
    client.setServer(mqtt_server, atoi(mqtt_port));
    
    // Start NTP only if connected to avoid crash
    if (WiFi.status() == WL_CONNECTED) {
        timeClient->begin();
        setupOTA();
    }
}

void NetworkManager::loop() {
    wm.process(); // Critical for non-blocking portal
    
    if (WiFi.status() == WL_CONNECTED) {
       timeClient->update();
       ArduinoOTA.handle();
    }

    if (!client.connected()) {
        long now = millis();
        if (now - lastReconnectAttempt > 5000) {
            lastReconnectAttempt = now;
            reconnect();
        }
    } else {
        client.loop();
    }
}

void NetworkManager::reconnect() {
    Serial.print("Attempting MQTT connection...");
    String clientId = "PlantCare-" + String(random(0xffff), HEX);
    
    // Last Will: Topic, Payload, Retain, QoS
    char willTopic[50];
    getDeviceTopic("online", willTopic, sizeof(willTopic));

    // Connect with LWT: if we die, broker sends "false" (valid JSON)
    if (client.connect(clientId.c_str(), willTopic, 0, true, "false")) {
        Serial.println("connected");
        
        // Immediately say we are ONLINE (Retained)
        publishDevice("online", "true");

        char topic[50];
        getDeviceTopic("cmd", topic, sizeof(topic));
        client.subscribe(topic);
    } else {
        Serial.print("failed, rc=");
        Serial.print(client.state());
        Serial.println(" try again in 5 seconds");
    }
}

void NetworkManager::publish(const char* topic, const char* payload) {
    if (client.connected()) {
        client.publish(topic, payload);
    }
}

void NetworkManager::setCallback(MQTT_CALLBACK_SIGNATURE) {
    client.setCallback(callback);
}

bool NetworkManager::isConnected() {
    return client.connected();
}

void NetworkManager::getDeviceTopic(const char* suffix, char* buffer, size_t len) {
    snprintf(buffer, len, "plantcare/%s/%s", DEVICE_ID, suffix);
}

void NetworkManager::publishDevice(const char* suffix, const char* payload) {
    char topic[50];
    getDeviceTopic(suffix, topic, sizeof(topic));
    // Default publish is not retained, but online status SHOULD be if we called it manually (though LWT handles the offline retain)
    // For simplicity, we just publish. If we want retain for ONLINE, we need to add a parameter.
    // Let's modify publish to check if it is "online" topic or add a bool.
    // For now, simple publish is fine, but for LWT "ONLINE" it's best to be retained so new clients see it.
    bool retain = (strcmp(suffix, "online") == 0);
    client.publish(topic, payload, retain);
}

int NetworkManager::getHour() {
    return timeClient->getHours();
}



String NetworkManager::getFormattedTime() {
    return timeClient->getFormattedTime();
}
