#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include "Config.h"

class SensorManager {
private:
    int _pin;
    int _airValue;
    int _waterValue;

public:
    SensorManager(int pin, int airValue, int waterValue);
    
    void begin();
    
    // Returns raw ADC value (0-4095)
    int getRaw();
    
    // Returns moisture percentage (0-100%)
    int getMoisturePercentage();
    
    // Returns true if sensor is disconnected or shorted
    bool isHealthy();
};

#endif
