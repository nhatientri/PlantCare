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

// Helper to get day of year for daily limit tracking
int PlantControl::getDayOfYear() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) return -1;
    return timeinfo.tm_yday;
}

bool PlantControl::processAutoWatering(bool moistureNeedsWatering) {
    unsigned long now = millis();
    
    // Daily Limit Reset
    int day = getDayOfYear();
    if (day != -1 && day != currentDay) {
        currentDay = day;
        dailyWateringCount = 0;
        Serial.println("New Day: Resetting daily watering count.");
    }

    // State Machine
    switch (currentState) {
        case IDLE:
            if (moistureNeedsWatering) {
                if (!isDaytime()) {
                    Serial.println("Need water, but it's NIGHT. Skipping.");
                    return false;
                }
                
                if (dailyWateringCount >= MAX_DAILY_CYCLES) {
                     Serial.println("Need water, but DAILY LIMIT reached. Skipping to prevent flooding.");
                     return false;
                }

                // Start Watering Session
                Serial.println("Starting Watering Session (Burst 1)");
                turnPumpOn();
                currentState = WATERING;
                stateStartTime = now;
                currentSessionCycles = 1;
                dailyWateringCount++;
                return true;
            }
            break;

        case WATERING:
            // Pump is ON. Check if burst time is over.
            if (now - stateStartTime >= PUMP_BURST_MS) {
                Serial.println("Burst finished. Turning Pump OFF. Starting Soak.");
                turnPumpOff();
                currentState = SOAKING;
                stateStartTime = now;
                return false; 
            }
            return true; // Pump is still running

        case SOAKING:
            // Pump is OFF. Waiting for water to soak in.
            if (now - stateStartTime >= PUMP_SOAK_MS) {
                // Soak finished. Check if we need more water.
                if (moistureNeedsWatering) {
                    if (currentSessionCycles < MAX_WATERING_CYCLES) {
                        Serial.printf("Still dry after soak. Starting Burst %d\n", currentSessionCycles + 1);
                        turnPumpOn();
                        currentState = WATERING;
                        stateStartTime = now;
                        currentSessionCycles++;
                        return true;
                    } else {
                        Serial.println("Still dry after MAX cycles. Stopping session.");
                        currentState = IDLE;
                        return false;
                    }
                } else {
                    Serial.println("Moisture OK after soak. Session complete.");
                    currentState = IDLE;
                    return false;
                }
            }
            break;
    }

    return (currentState == WATERING);
}

void PlantControl::turnPumpOn() {
    digitalWrite(PUMP_PIN, HIGH);
}

void PlantControl::turnPumpOff() {
    digitalWrite(PUMP_PIN, LOW);
}
