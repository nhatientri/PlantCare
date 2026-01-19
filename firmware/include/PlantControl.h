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
    bool isDaytime();
};

#endif
