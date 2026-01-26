#include "PlantControl.h"

PlantControl::PlantControl(SensorManager* s, NetworkManager* n, ConfigManager* c) {
    sensors = s;
    network = n;
    config = c;
    currentState = IDLE;
}

void PlantControl::begin() {
    pinMode(PUMP_PIN, OUTPUT);
    turnPump(false);
    
    // Load calibration from Config
    // We can't know size easily without getting readings first or exposing size.
    // Let's assume SensorManager is initialized.
    std::vector<SensorDetail> readings = sensors->getReadings();
    for(int i=0; i<readings.size(); i++) {
        int air = config->loadAirValue(i);
        int water = config->loadWaterValue(i);
        sensors->setCalibration(i, air, water);
    }
}

void PlantControl::setState(State newState) {
    currentState = newState;
    stateStartTime = millis();
    broadcastStatus();
}

void PlantControl::turnPump(bool on) {
    digitalWrite(PUMP_PIN, on ? HIGH : LOW);
    // If relay is active low, invert this. Assuming Active High for now.
}

void PlantControl::update() {
    unsigned long elapsed = millis() - stateStartTime;

    switch (currentState) {
        case IDLE:
            // Check sensors periodically (e.g. every 5 seconds) or every loop
            // For checking threshold:
            {
                // Simple hygiene check interval could be added here
                if (elapsed > CHECK_INTERVAL) { 
                    sensors->update();
                    float avg = sensors->getAverageMoisture();
                    int threshold = config->loadThreshold();
                    
                    if (avg < threshold) {
                         // Check Time: Morning (6-10) OR Afternoon (16-19)
                         int h = network->getHour();
                         bool isMorning = (h >= 6 && h < 10);
                         bool isAfternoon = (h >= 16 && h < 19);
                         
                         if (isMorning || isAfternoon) {
                             // Snapshot usage for validation logic later
                             sensors->snapshotMoisture();
                             setState(WATERING);
                         } else {
                             // Restricted time
                             if (elapsed > 3600000) { // Log once an hour
                                 char msg[64];
                                 snprintf(msg, sizeof(msg), "Skipping water (Values: %.1f%%). Time: %02d:00", avg, h);
                                 network->publish("plantcare/log", msg);
                                 stateStartTime = millis(); 
                             }
                         }
                    }
                    // Reset timer to avoid flooding logs/checks if we were just idle
                    if (currentState == IDLE) { // Only reset if we didn't switch state
                         stateStartTime = millis(); 
                         broadcastStatus(); 
                    }
                }
            }
            break;

        case WATERING:
            turnPump(true);
            if (elapsed >= WATERING_DURATION) {
                turnPump(false);
                setState(SOAKING);
            }
            break;

        case SOAKING:
            if (elapsed >= SOAK_DURATION) {
                // End of soak. Check results.
                sensors->update();
                std::vector<bool> results = sensors->validateRise(RISE_THRESHOLD);
                bool tankEmpty = sensors->checkTankEmpty(results);

                if (tankEmpty) {
                    strcpy(failMessage, "Tank Empty / Pump Failure");
                    setState(ERROR_TANK_EMPTY);
                } else {
                    // Check for individual faulty sensors
                    bool anyFault = false;
                    for (int i = 0; i < results.size(); i++) {
                        if (!results[i]) {
                             anyFault = true;
                             // Log specific sensor fault logic here or send MQTT alert
                             String msg = "Warning: Sensor " + String(i) + " did not respond to watering.";
                             network->publishDevice("alert", msg.c_str());
                        }
                    }

                    // Decide if we need more water or back to IDLE
                    float avg = sensors->getAverageMoisture();
                    if (avg < config->loadThreshold()) {
                         // Need more water, but ensure we don't loop forever if tank is empty behavior matches but sensors are just weird.
                         // For now, loop back to WATERING
                         sensors->snapshotMoisture(); // New snapshot
                         setState(WATERING);
                    } else {
                         setState(IDLE);
                    }
                }
            }
            break;

        case ERROR_TANK_EMPTY:
        case ERROR_SENSOR_FAULT:
            // Stay here until reset
            // Maybe blink LED
            if (elapsed > 3600000) { // 1 Hour
                 network->publishDevice("alert", failMessage);
                 stateStartTime = millis(); // Resend alert every hour
            }
            break;
    }
}

void PlantControl::broadcastStatus() {
    // Build JSON
    JsonDocument doc;
    doc["device_id"] = DEVICE_ID;
    doc["state"] = currentState;
    doc["moisture"] = sensors->getAverageMoisture();
    
    // Add individual values (backward compatibility)
    JsonArray peaks = doc["sensors"].to<JsonArray>();
    std::vector<SensorDetail> readings = sensors->getReadings();
    for(auto& val : readings) peaks.add(val.percent);

    // Add detailed debug info
    JsonArray details = doc["sensor_details"].to<JsonArray>();
    for(int i=0; i<readings.size(); i++) {
        SensorDetail& val = readings[i];
        JsonObject d = details.add<JsonObject>();
        d["pin"] = val.pin;
        d["adc"] = val.raw;
        d["pct"] = val.percent;
        d["air_cal"] = sensors->getAirValue(i);
        d["water_cal"] = sensors->getWaterValue(i);
    }
    
    // Explicit array for calibration (more robust)
    JsonArray cal = doc["calibration"].to<JsonArray>();
    for(int i=0; i<readings.size(); i++) {
        JsonObject c = cal.add<JsonObject>();
        c["index"] = i;
        c["air"] = sensors->getAirValue(i);
        c["water"] = sensors->getWaterValue(i);
    }

    DHTReading dht = sensors->getDHT();
    doc["temp"] = dht.temperature;
    doc["humidity"] = dht.humidity;
    doc["claim_pass"] = config->loadPassword(); // For claiming
    doc["threshold"] = config->loadThreshold();
    doc["rssi"] = WiFi.RSSI();

    char buffer[512];
    serializeJson(doc, buffer);
    network->publishDevice("status", buffer);
}

void PlantControl::processCommand(const char* topic, const char* payload) {
    char cmdTopic[50];
    network->getDeviceTopic("cmd", cmdTopic, sizeof(cmdTopic));

    if (strcmp(topic, cmdTopic) == 0) {
        if (strncmp(payload, "PUMP_ON", 7) == 0) {
            sensors->snapshotMoisture(); // Snapshot before manual run
            setState(WATERING); // Manual trigger
        } else if (strncmp(payload, "RESET", 5) == 0) {
            setState(IDLE);
        } else if (strncmp(payload, "SET_THRESHOLD:", 14) == 0) {
            int newThresh = atoi(payload + 14);
            config->saveThreshold(newThresh);
            network->publish("plantcare/log", "Threshold updated");
            broadcastStatus(); // Confirm change to frontend immediately
        } else if (strncmp(payload, "SET_CALIBRATION_VALUES:", 23) == 0) {
             // Format: SET_CALIBRATION_VALUES:index:air:water
             int idx, air, water;
             if (sscanf(payload, "SET_CALIBRATION_VALUES:%d:%d:%d", &idx, &air, &water) == 3) {
                 sensors->setCalibration(idx, air, water);
                 config->saveAirValue(idx, air);
                 config->saveWaterValue(idx, water);
                 network->publish("plantcare/log", "Calibration updated");
                 broadcastStatus();
             }
        }
    }
}
