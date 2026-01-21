#ifndef PLANT_CONTROL_H
#define PLANT_CONTROL_H

#include <Arduino.h>
#include "time.h"
#include "Config.h"

class PlantControl {
public:
    PlantControl();
    void setup();
    void syncTime();
    
    // Checks time schedule and moisture request to effectively turn on/off pump
    // Accepts current average moisture to track tank levels
    bool processAutoWatering(bool moistureNeedsWatering, int currentAvgMoisture, bool isSafeToWater);
    
    void startManualWatering();
    
    // Accessors for state
    bool isTankEmptyAlert() { return isTankEmpty; }
    void resetAlerts() { isTankEmpty = false; tankFailureCount = 0; }

private:
    // Smart Watering State
    enum WateringState {
        IDLE,
        WATERING,
        SOAKING,
        MANUAL_WATERING
    };
    
    WateringState currentState = IDLE;
    unsigned long stateStartTime = 0;
    int currentSessionCycles = 0;
    
    // Day tracking for daily limit
    int currentDay = -1;
    int dailyWateringCount = 0;

    // Tank Empty Logic
    bool isTankEmpty = false;
    int tankFailureCount = 0;
    int startSessionMoisture = 0; // Snapshot before watering

    bool isWateringWindow(); // Renamed from isDaytime
    int getDayOfYear();
};

#endif
