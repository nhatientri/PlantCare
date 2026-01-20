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
    bool processAutoWatering(bool moistureNeedsWatering);
    
    void turnPumpOn();
    void turnPumpOff();

private:
    // Smart Watering State
    enum WateringState {
        IDLE,
        WATERING,
        SOAKING
    };
    
    WateringState currentState = IDLE;
    unsigned long stateStartTime = 0;
    int currentSessionCycles = 0;
    
    // Day tracking for daily limit
    int currentDay = -1;
    int dailyWateringCount = 0;

    bool isDaytime();
    int getDayOfYear();
};

#endif
