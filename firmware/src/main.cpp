#include <Arduino.h>
#include "ConfigManager.h"
#include "NetworkManager.h"
#include "SensorManager.h"
#include "PlantControl.h"

// Global instances
ConfigManager configManager;
NetworkManager networkManager;
SensorManager sensorManager;
PlantControl plantControl(&sensorManager, &networkManager, &configManager);

// MQTT Callback to pass to PlantControl
void mqttCallback(char* topic, uint8_t* payload, unsigned int length) {
    // Convert payload to string
    char p[length + 1];
    memcpy(p, payload, length);
    p[length] = '\0';
    
    Serial.printf("Message arrived [%s] %s\n", topic, p);
    plantControl.processCommand(topic, p);
}

void setup() {
    Serial.begin(115200);
    
    // 1. Init Config (Preferences)
    configManager.begin();
    
    // 2. Init Sensors
    sensorManager.begin();
    
    // 3. Init Network (WiFi + MQTT)
    // This might block if portal is active, but we set non-blocking
    networkManager.begin(&configManager);
    networkManager.setCallback(mqttCallback);
    
    // 4. Init Plant Control
    plantControl.begin();
    
    Serial.println("System Initialized");
}

void loop() {
    // Update all components
    networkManager.loop();

    // If OTA is running, skip other tasks to ensure timing
    if (!networkManager.isOTA()) {
        sensorManager.update();
        plantControl.update();
    }
}
