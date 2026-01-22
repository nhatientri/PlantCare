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

bool PlantControl::isWateringWindow() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        Serial.println("Time sync failed, assuming safe mode (Window=TRUE)");
        return true; 
    }
    
    int h = timeinfo.tm_hour;
    // Morning: 6-9, Evening: 17-20
    if ((h >= 6 && h < 9) || (h >= 17 && h < 20)) {
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

bool PlantControl::processAutoWatering(bool moistureNeedsWatering, int currentAvgMoisture, bool isSafeToWater) {
    unsigned long now = millis();
    
    // Daily Limit Reset
    int day = getDayOfYear();
    if (day != -1 && day != currentDay) {
        currentDay = day;
        dailyWateringCount = 0;
        Serial.println("New Day: Resetting daily watering count.");
    }

    // Auto-Recovery Check (Always runs): 
    // If water level ROSE significantly manually or by luck, clear error
    if (isTankEmpty) {
       // We can't really check "Session Start" here easily if we aren't in a session.
       // But if we see moisture is GOOD (not needing water), maybe we clear it?
       // OR: The user requested comparison. Let's do it inside the SOAK check.
    }

    // State Machine
    switch (currentState) {
        case IDLE:
            if (moistureNeedsWatering) {
                 // 0. Safety Lock Check
                 if (isSafetyLocked) {
                     Serial.println("Safety Block: SYSTEM LOCKED by AI. Skipping.");
                     lastStatusMessage = "AI Lockout";
                     return false;
                 }
                 
                // 1. Safety Check: Too Wet?
                if (!isSafeToWater) {
                    Serial.println("Safety Block: One or more plants are TOO WET. Skipping.");
                    lastStatusMessage = "Safety: Too Wet";
                    return false;
                }

                // 2. Safety Check: Tank Empty?
                if (isTankEmpty) {
                    Serial.println("Alert: TANK EMPTY. Auto-watering blocked.");
                    lastStatusMessage = "Tank Empty!";
                    return false;
                }

                // 3. Time Window Check
                if (!isWateringWindow()) {
                     Serial.println("Need water, but outside Optimal Hours. Skipping.");
                     lastStatusMessage = "Outside Hours (6-9, 17-20)";
                     return false;
                }
                
                // 4. Daily Limit Check
                if (dailyWateringCount >= MAX_DAILY_CYCLES) {
                     Serial.println("Need water, but DAILY LIMIT reached. Skipping.");
                     lastStatusMessage = "Daily Limit Reached";
                     return false;
                }

                // Start Watering Session
                Serial.println("Starting Watering Session (Burst 1)");
                lastStatusMessage = "Watering";
                digitalWrite(PUMP_PIN, HIGH);
                currentState = WATERING;
                stateStartTime = now;
                currentSessionCycles = 1;
                dailyWateringCount++;
                
                // Capture baseline for Tank Check
                startSessionMoisture = currentAvgMoisture;
                return true;
            }
            break;

        case WATERING:
            // Pump is ON. Check if burst time is over.
            if (now - stateStartTime >= PUMP_BURST_MS) {
                Serial.println("Burst finished. Turning Pump OFF. Starting Soak.");
                digitalWrite(PUMP_PIN, LOW);
                currentState = SOAKING;
                stateStartTime = now;
                lastStatusMessage = "Soaking";
                return false; 
            }
            return true; // Pump is still running

        case SOAKING:
            // Pump is OFF. Waiting for water to soak in.
            if (now - stateStartTime >= PUMP_SOAK_MS) {
                // Soak finished. 
                
                // --- Tank Empty / Recovery Logic ---
                int rise = currentAvgMoisture - startSessionMoisture;
                Serial.printf("Soak Complete. Moisture Rise: %d%%\n", rise);
                
                if (rise >= MOISTURE_RECOVERY_RISE) {
                    if (isTankEmpty) {
                        Serial.println("Auto-Recovery: Moisture rose! Clearing Tank Empty alert.");
                        isTankEmpty = false; 
                        tankFailureCount = 0;
                    }
                } else if (rise < TANK_CHECK_TOLERANCE) {
                    // It didn't go up. Possible empty tank.
                    tankFailureCount++;
                    Serial.printf("Warning: Moisture didn't rise. Failure Count: %d\n", tankFailureCount);
                    if (tankFailureCount >= MAX_TANK_FAILURES) {
                        isTankEmpty = true;
                        Serial.println("CRITICAL: Tank Empty detected!");
                    }
                } else {
                    // It went up a little, assume it's working but maybe slow. Reset failure.
                    tankFailureCount = 0;
                }
                // -----------------------------------

                // Check if we still need water
                if (moistureNeedsWatering && !isTankEmpty) {
                    if (currentSessionCycles < MAX_WATERING_CYCLES) {
                        Serial.printf("Still dry. Starting Burst %d\n", currentSessionCycles + 1);
                        digitalWrite(PUMP_PIN, HIGH);
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
                    Serial.println("Session complete (Moisture OK or Tank Empty).");
                    currentState = IDLE;
                    return false;
                }
            }
            break;
            
        case MANUAL_WATERING:
            if (now - stateStartTime >= 5000) { // 5 Second Safety Limit for Manual
                Serial.println("Manual Watering Timer Finished. Pump OFF.");
                digitalWrite(PUMP_PIN, LOW);
                currentState = IDLE;
                return false;
            }
            return true; // Pump is ON
    }

    return (currentState == WATERING || currentState == MANUAL_WATERING);
}

void PlantControl::startManualWatering() {
    if (isSafetyLocked) {
        Serial.println("Manual Watering BLOCKED: System is Locked!");
        lastStatusMessage = "Blocked: System Locked";
        return;
    }
    Serial.println("Manual Watering Triggered!");
    lastStatusMessage = "Manual Watering";
    digitalWrite(PUMP_PIN, HIGH);
    currentState = MANUAL_WATERING;
    stateStartTime = millis();
}

void PlantControl::turnPumpOff() {
    digitalWrite(PUMP_PIN, LOW);
    currentState = IDLE;
    Serial.println("Pump Force Stopped via helper.");
}


