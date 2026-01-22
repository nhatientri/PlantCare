#ifndef PUMP_CONTROLLER_H
#define PUMP_CONTROLLER_H

#include <Arduino.h>
#include "Config.h"

class PumpController {
private:
    int _pin;
    unsigned long _maxRuntime;
    unsigned long _startTime;
    bool _isRunning;

public:
    PumpController(int pin, unsigned long maxRuntime);
    
    void begin();
    
    void turnOn();
    void turnOff();
    
    // Call this in the main loop to enforce safety timeouts
    void update();
    
    bool isRunning();
};

#endif
