#include <Arduino.h>
#include <ArduinoJson.h> // Ensure we use this for robust parsing
#include "Config.h"
#include "SensorManager.h"
#include "DHTManager.h"
#include "PumpController.h"
#include "PlantControl.h"
#include "NetworkManager.h"

// --- Global Objects ---
SensorManager* sensor = nullptr;
DHTManager* dht = nullptr;
PumpController* pump = nullptr;
PlantControl* plantControl = nullptr;
NetworkManager* network = nullptr;

// --- MQTT Callback ---
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
    // 1. Convert Payload to String
    char message[length + 1];
    for (unsigned int i = 0; i < length; i++) {
        message[i] = (char)payload[i];
    }
    message[length] = '\0';
    
    Serial.print("Command received [");
    Serial.print(topic);
    Serial.print("]: ");
    Serial.println(message);

    // 2. Parse JSON Command
    // Expected format: {"command": "SET_THRESHOLD", "value": 40} OR {"command": "PUMP_ON"}
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        Serial.print("deserializeJson() failed: ");
        Serial.println(error.c_str());
        return;
    }

    const char* command = doc["command"];

    // Check for "target" device ID. If present and mismatch, ignore.
    if (doc["target"].is<const char*>()) {
        const char* target = doc["target"];
        if (strcmp(target, DEVICE_ID) != 0) {
            Serial.print("Ignoring command for target: ");
            Serial.println(target);
            return;
        }
    }

    if (strcmp(command, "SET_THRESHOLD") == 0) {
        if (doc["value"].is<int>()) {
            int newVal = doc["value"];
            plantControl->setMoistureThreshold(newVal);
            network->publish("plantcare/logs", "Threshold Updated");
        }
    } 
    else if (strcmp(command, "PUMP_ON") == 0) {
         // Manual override - simpler to just trigger watering state, 
         // but FSM logic might fight it. 
         // For now, let's just log it. Implementing full manual override 
         // requires a ManualState or forcing the pump controller.
         network->publish("plantcare/logs", "Manual Pump Command Received (Not Implemented yet)");
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n--- PlantCare Firmware Starting ---");
    
    // 1. Initialize Hardware Components
    sensor = new SensorManager(PIN_SOIL_SENSOR, SENSOR_AIR_VALUE, SENSOR_WATER_VALUE);
    dht = new DHTManager(PIN_DHT_SENSOR, DHT22);
    pump = new PumpController(PIN_PUMP_RELAY, MAX_PUMP_RUNTIME_MS);
    
    // 2. Initialize Logic
    plantControl = new PlantControl(sensor, pump, dht);
    plantControl->begin();
    
    // 3. Initialize Network
    network = NetworkManager::getInstance();
    network->setup();
    network->setCallback(onMqttMessage);
    
    Serial.println("System Ready.");
}

void loop() {
    // 1. Network Loop (Keep WiFi/MQTT alive)
    network->loop();
    
    // 2. Control Loop
    plantControl->update();
    
    // 3. Reporting Loop (Every 5 seconds)
    static unsigned long lastReport = 0;
    if (millis() - lastReport > 5000) {
        int moisture = sensor->getMoisturePercentage();
        bool isPumpRunning = pump->isRunning();
        
        // DHT Readings
        float temperature = dht->getTemperature();
        float humidity = dht->getHumidity();
        
        // Check if DHT read failed (returns NaN)
        if (isnan(temperature)) temperature = 0.0;
        if (isnan(humidity)) humidity = 0.0;
        
        Serial.printf("[REPORT] Moisture: %d%% | Temp: %.1fC | Hum: %.1f%% | Pump: %s\n", 
                      moisture, temperature, humidity, isPumpRunning ? "ON" : "OFF");
        
        // Publish extended data using JSON
        char msg[256];
        snprintf(msg, sizeof(msg), 
                 "{\"deviceId\":\"%s\", \"moisture\":%d, \"temp\":%.1f, \"humidity\":%.1f, \"pump\":%s, \"threshold\":%d}", 
                 DEVICE_ID, moisture, temperature, humidity, isPumpRunning ? "true" : "false", plantControl->getMoistureThreshold());
                 
        network->publish("plantcare/readings", msg);
        
        lastReport = millis();
    }
}
