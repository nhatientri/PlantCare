#include "PumpController.h"

PumpController::PumpController(int pin, unsigned long maxRuntime) 
    : _pin(pin), _maxRuntime(maxRuntime), _startTime(0), _isRunning(false) {
}

void PumpController::begin() {
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW); // Ensure pump is off at startup
}

void PumpController::turnOn() {
    if (!_isRunning) {
        digitalWrite(_pin, HIGH);
        _startTime = millis();
        _isRunning = true;
        Serial.println("Pump turned ON");
    }
}

void PumpController::turnOff() {
    if (_isRunning) {
        digitalWrite(_pin, LOW);
        _isRunning = false;
        Serial.println("Pump turned OFF");
    }
}

void PumpController::update() {
    if (_isRunning) {
        if (millis() - _startTime >= _maxRuntime) {
            Serial.println("SAFETY STOP: Pump exceeded max runtime!");
            turnOff();
        }
    }
}

bool PumpController::isRunning() {
    return _isRunning;
}
