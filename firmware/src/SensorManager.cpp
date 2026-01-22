#include "SensorManager.h"

SensorManager::SensorManager(int pin, int airValue, int waterValue) 
    : _pin(pin), _airValue(airValue), _waterValue(waterValue) {
}

void SensorManager::begin() {
    pinMode(_pin, INPUT);
}

int SensorManager::getRaw() {
    return analogRead(_pin);
}

int SensorManager::getMoisturePercentage() {
    int raw = getRaw();
    
    // Constrain the raw value to the calibration (inverted logic: Air is high, Water is low)
    int constrainedRaw = constrain(raw, _waterValue, _airValue);
    
    // Map to 0-100%
    int percent = map(constrainedRaw, _airValue, _waterValue, 0, 100);
    
    return percent;
}

bool SensorManager::isHealthy() {
    int raw = getRaw();
    // Simple check: if reading is absolute 0 or 4095 (and not calibrated close to it), 
    // it *might* be an error. For reliability, we use a Safe Range.
    // 4095 is default floating for some pins or max voltage, but in air it's close to 4095.
    // Let's define "Healthy" as "Within reasonable physical limits".
    // 0 is usually ground short.
    if (raw < 100) return false; // Likely Short
    // Note: Open circuit on ESP32 often floats. 
    // We assume 4095 is "Dry Air" which is valid.
    // A specific "Disconnected" check might require pull-down resistors.
    return true;
}
