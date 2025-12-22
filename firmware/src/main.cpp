#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "time.h"
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

  // Init Time
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
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

  // Check Time Schedule
  struct tm timeinfo;
  bool isDaytime = true; // Default to true if time fails, or false? Let's default true to be safe, or false to save water.
  
  if (getLocalTime(&timeinfo)) {
    // Valid time obtained
    if (timeinfo.tm_hour >= START_HOUR && timeinfo.tm_hour < END_HOUR) {
      isDaytime = true;
    } else {
      isDaytime = false;
    }
    Serial.printf("Time: %02d:%02d. Daytime? %s\n", timeinfo.tm_hour, timeinfo.tm_min, isDaytime ? "YES" : "NO");
  } else {
    Serial.println("Time sync failed, assuming safe mode (Daytime=TRUE)");
  }

  // Control Pump (Auto)
  if (pumpNeedsOn) {
    if (isDaytime) {
       Serial.println("Warning: Low moisture + Daytime. Pump ON.");
       digitalWrite(PUMP_PIN, HIGH);
    } else {
       Serial.println("Low moisture but NIGHT TIME. Skipping Pump.");
       pumpNeedsOn = false; // Update state for backend reporting
       digitalWrite(PUMP_PIN, LOW);
    }
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

      // Parse Response for Commands
      StaticJsonDocument<200> resDoc;
      DeserializationError error = deserializeJson(resDoc, response);
      if (!error) {
        const char* cmd = resDoc["command"];
        if (cmd && strcmp(cmd, "PUMP_ON") == 0) {
          Serial.println("COMMAND RECEIVED: PUMPON");
          digitalWrite(PUMP_PIN, HIGH);
          delay(5000); // Keep on for 5 seconds (Blocking for simplicity)
          digitalWrite(PUMP_PIN, LOW);
          Serial.println("Pump sequence finished.");
        }
      }
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }

  delay(READ_INTERVAL);
}
