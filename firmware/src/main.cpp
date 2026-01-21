#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "time.h"
#include "Config.h"
#include <Preferences.h>
#include "NetworkManager.h"
#include "SensorManager.h"
#include "PlantControl.h"

// Globals
Preferences preferences;
NetworkManager network;
SensorManager sensors;
PlantControl controller;
int wateringThreshold = DEFAULT_MOISTURE_THRESHOLD;

unsigned long lastReadTime = 0;

// Forward Declaration
void callback(char* topic, byte* payload, unsigned int length);

void setup() {
  Serial.begin(115200);

  // 1. Load Preferences
  preferences.begin("plantcare", false);
  wateringThreshold = preferences.getInt("threshold", DEFAULT_MOISTURE_THRESHOLD);
  Serial.printf("Loaded Threshold: %d%%\n", wateringThreshold);

  // 2. Initialize Managers
  sensors.setup();
  controller.setup();

  // 3. Network Setup (Blocks until Connected)
  network.setup(callback);

  // 4. Init Time (After WiFi)
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
}

void loop() {
  network.loop();

  unsigned long now = millis();
  if (now - lastReadTime < READ_INTERVAL) {
    return;
  }
  lastReadTime = now;

  // --- 1. Read Sensors ---
  sensors.update(); // Update cache
  float temperature = sensors.readTemperature();
  float humidity = sensors.readHumidity();

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    temperature = 0;
    humidity = 0;
  }

  // Moisture Reading
  PlantData plantsData[NUM_PLANTS];
  bool pumpNeedsOn = false;
  sensors.readSoilMoisture(plantsData, NUM_PLANTS, wateringThreshold, pumpNeedsOn);

  // Advanced Safety Checks
  int avgMoisture = sensors.getAllPlantMoistureAverage();
  bool isSafe = !sensors.isAnyPlantWet(SAFE_MAX_MOISTURE);

  // --- 2. Control Pump ---
  bool pumpState = controller.processAutoWatering(pumpNeedsOn, avgMoisture, isSafe);

  // --- 3. Prepare Data Packet ---
  JsonDocument doc;
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["pumpState"] = pumpState;
  doc["threshold"] = wateringThreshold;
  doc["tankEmpty"] = controller.isTankEmptyAlert();

  JsonArray plantsArray = doc["plants"].to<JsonArray>();
  for (int i = 0; i < NUM_PLANTS; i++) {
    JsonObject p = plantsArray.add<JsonObject>();
    p["index"] = plantsData[i].index;
    p["moisture"] = plantsData[i].moisturePercent;
  }

  String jsonStr;
  serializeJson(doc, jsonStr);
  Serial.println(jsonStr);

  // --- 4. Send Data (HTTP) ---
  if (network.isConnected()) {
    // WiFiClient wifiClient; // Independent client for HTTP
    WiFiClientSecure client;
    client.setInsecure(); // Skip certificate verification
    HTTPClient http;
    http.begin(client, SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-secret", DEVICE_SECRET);
    
    int httpResponseCode = http.POST(jsonStr);
    if (httpResponseCode > 0) {
      Serial.printf("HTTP POST Success: %d\n", httpResponseCode);
    } else {
      Serial.printf("HTTP POST Failed: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  }


}

// MQTT Callback
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("MQTT Message [%s]: %s\n", topic, message.c_str());

  if (message == "PUMP_ON") {
      // Manual Override (Non-Blocking)
      controller.startManualWatering();
  }
  else if (message == "LOCK_SYSTEM") {
      controller.lockSystem();
      Serial.println("Command: LOCK_SYSTEM executed.");
  }
  else if (message.startsWith("SET_THRESHOLD:")) {
      int newThreshold = message.substring(14).toInt();
      if (newThreshold >= 0 && newThreshold <= 100) {
          wateringThreshold = newThreshold;
          preferences.putInt("threshold", wateringThreshold);
          Serial.printf("Updated Threshold to %d%%\n", wateringThreshold);
          
          // Acknowledge via Status/Response
          String responseTopic = "plantcare/" + String(DEVICE_ID) + "/response";
          String response = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",\"threshold\":" + String(wateringThreshold) + ",\"status\":\"success\"}";
          network.publish(responseTopic.c_str(), response.c_str());

          // Push immediate update
          JsonDocument statusDoc;
          statusDoc["deviceId"] = DEVICE_ID;
          statusDoc["threshold"] = wateringThreshold;
          statusDoc["updateType"] = "threshold";
          String statusPayload;
          serializeJson(statusDoc, statusPayload);
          network.publish(MQTT_TOPIC_DATA, statusPayload.c_str());
      }
  }
  else if (message == "RESET_ALERTS") {
       controller.resetAlerts();
  }
  else if (message == "GET_THRESHOLD") {
       String responseTopic = "plantcare/" + String(DEVICE_ID) + "/response";
       String response = "{\"deviceId\":\"" + String(DEVICE_ID) + "\",\"threshold\":" + String(wateringThreshold) + "}";
       network.publish(responseTopic.c_str(), response.c_str());
  }
  else if (message == "CLEAR_PREFS") {
       preferences.clear();
       wateringThreshold = DEFAULT_MOISTURE_THRESHOLD;
       Serial.println("Preferences Cleared");
  }
}
