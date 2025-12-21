#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "Config.h"

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  
  // Initialize Pins
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW); // Pump OFF initially
  
  for(int i=0; i<NUM_PLANTS; i++) {
    pinMode(MOISTURE_PINS[i], INPUT);
  }

  // Initialize DHT
  dht.begin();

  // Connect to WiFi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Read DHT
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    // We continue to read moisture anyway, or return? 
    // Let's set them to 0 or continue.
    temperature = 0;
    humidity = 0; 
  }

  // Read Moisture Sensors & logic
  bool pumpNeedsOn = false;
  StaticJsonDocument<512> doc; // Increased size for array
  
  doc["deviceId"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;

  JsonArray plants = doc.createNestedArray("plants");

  Serial.printf("Temp: %.1f C, Hum: %.1f %%\n", temperature, humidity);

  for(int i=0; i<NUM_PLANTS; i++) {
    int raw = analogRead(MOISTURE_PINS[i]);
    int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
    percent = constrain(percent, 0, 100);
    
    Serial.printf("Plant %d: %d %%\n", i, percent);
    
    JsonObject p = plants.createNestedObject();
    p["index"] = i;
    p["moisture"] = percent;

    if (percent < MOISTURE_THRESHOLD) {
      pumpNeedsOn = true;
    }
  }

  // Control Pump
  if (pumpNeedsOn) {
    Serial.println("Warning: Low moisture detected! Pump ON.");
    digitalWrite(PUMP_PIN, HIGH);
  } else {
    digitalWrite(PUMP_PIN, LOW);
  }
  
  doc["pumpState"] = pumpNeedsOn;

  // Send Data to Backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String jsonStr;
    serializeJson(doc, jsonStr);

    int httpResponseCode = http.POST(jsonStr);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server Response: " + response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  delay(READ_INTERVAL);
}
