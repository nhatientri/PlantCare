#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "time.h"
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include "time.h"
#include "Config.h"

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastReadTime = 0;

// Forward declaration
void callback(char* topic, byte* payload, unsigned int length);

#include <WiFiManager.h>


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


  Serial.begin(115200);
  
  // Initialize Pins
  pinMode(PUMP_PIN, OUTPUT);
  digitalWrite(PUMP_PIN, LOW); // Pump OFF initially
  
  for(int i=0; i<NUM_PLANTS; i++) {
    pinMode(MOISTURE_PINS[i], INPUT);
  }

  // Initialize DHT
  dht.begin();

  // WiFiManager
  // Local intialization. Once its business is done, there is no need to keep it around
  WiFiManager wifiManager;

  // Set timeout (optional) - if it can't connect, it restarts or keeps trying
  // wifiManager.setTimeout(180); 

  // Create a unique AP name based on device ID
  String apName = "PlantCare-" + String(DEVICE_ID);
  
  // If connection fails, it starts an access point with the specified name
  // and goes into a blocking loop awaiting configuration
  if (!wifiManager.autoConnect(apName.c_str())) {
    Serial.println("failed to connect and hit timeout");
    // reset and try again, or maybe put it to deep sleep
    ESP.restart();
    delay(1000);
  }

  // if you get here you have connected to the WiFi
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Init Time
  configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);

  // Init MQTT
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
}

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  if (message == "PUMP_ON") {
      Serial.println("MQTT CMD: PUMP_ON");
      digitalWrite(PUMP_PIN, HIGH);
      // Note: This delay blocks everything, but for 5s command it might be acceptable 
      // OR better: set a flag to turn it off in main loop after 5s. 
      // For now, keeping simple blocking for the action itself as requested by common use cases, 
      // but ideally this should be non-blocking too.
      delay(5000); 
      digitalWrite(PUMP_PIN, LOW);
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = DEVICE_ID;
    clientId += String(random(0xffff), HEX);
    // Attempt to connect
    bool connected = false;
    if (String(MQTT_USER) == "") {
      connected = client.connect(clientId.c_str());
    } else {
      connected = client.connect(clientId.c_str(), MQTT_USER, MQTT_PASS); 
    }

    if (connected) {
      Serial.println("connected");
      // Resubscribe
      String topic = "plantcare/" + String(DEVICE_ID) + "/command";
      client.subscribe(topic.c_str());
      client.subscribe(MQTT_TOPIC_COMMAND); // Broad commands if needed
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Wait 5 seconds before retrying (blocking here is okay during reconnect phase or use non-blocking?)
      // For robustness in loop(), we shouldn't block here forever. 
      // Let's return and let loop call us again.
      return; 
    }
  }
}


void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastReadTime < READ_INTERVAL) {
    return; // Not time yet
  }
  lastReadTime = now;

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

  // Send Data to Backend (HTTP)
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
      // HTTP Command parsing removed in favor of MQTT, or keep as backup?
      // Leaving command parsing adds complexity with non-blocking. 
      // Let's rely on MQTT for commands as requested, but keeping HTTP for logging.
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  }
}
