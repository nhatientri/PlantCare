#include "PlantControl.h"

PlantControl::PlantControl() {
}

void PlantControl::setup() {
    pinMode(PUMP_PIN, OUTPUT);
    digitalWrite(PUMP_PIN, LOW);
    
    // Initialize time config
    configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
}

void PlantControl::syncTime() {
    // This is handled automatically by esp32 background tasks once configTime is called,
    // but we can add manual sync checks here if needed.
}

bool PlantControl::isDaytime() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Time sync failed, assuming safe mode (Daytime=TRUE)");
        return true; 
    }
    
    Serial.printf("Time: %02d:%02d\n", timeinfo.tm_hour, timeinfo.tm_min);
    
    if (timeinfo.tm_hour >= START_HOUR && timeinfo.tm_hour < END_HOUR) {
        return true;
    }
    return false;
}

bool PlantControl::processAutoWatering(bool moistureNeedsWatering) {
    if (moistureNeedsWatering) {
        if (isDaytime()) {
            Serial.println("Warning: Low moisture + Daytime. Pump ON.");
            turnPumpOn();
            return true;
        } else {
            Serial.println("Low moisture but NIGHT TIME. Skipping Pump.");
            turnPumpOff();
            return false;
        }
    } else {
        turnPumpOff();
        return false;
    }
}

void PlantControl::turnPumpOn() {
    digitalWrite(PUMP_PIN, HIGH);
}

void PlantControl::turnPumpOff() {
    digitalWrite(PUMP_PIN, LOW);
}
