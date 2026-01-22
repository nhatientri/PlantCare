#include "PlantControl.h"
#include "states/IdleState.h" 

PlantControl::PlantControl(SensorManager* sensor, PumpController* pump, DHTManager* dht) 
    : _sensor(sensor), _pump(pump), _dht(dht), _currentState(nullptr), _lastMoisture(0) {
    
    // Default will be overwritten by begin() if preferences exist
    _moistureThreshold = DEFAULT_MOISTURE_THRESHOLD;
}

void PlantControl::begin() {
    _sensor->begin();
    _pump->begin();
    _dht->begin();
    
    // Load Settings
    _preferences.begin("plantcare", false); // Namespace "plantcare", Read/Write mode
    _moistureThreshold = _preferences.getInt("threshold", DEFAULT_MOISTURE_THRESHOLD);
    Serial.print("Loaded Threshold from Flash: ");
    Serial.println(_moistureThreshold);
    _preferences.end();
    
    // Initial State
    changeState(new IdleState());
}

void PlantControl::update() {
    _pump->update(); // Safety check
    
    if (_currentState) {
        _currentState->update(this);
    }
}

void PlantControl::changeState(PlantState* newState) {
    if (_currentState) {
        _currentState->exit(this);
        delete _currentState; 
    }
    
    _currentState = newState;
    
    if (_currentState) {
        _currentState->enter(this);
    }
}

SensorManager* PlantControl::getSensor() {
    return _sensor;
}

PumpController* PlantControl::getPump() {
    return _pump;
}

DHTManager* PlantControl::getDHT() {
    return _dht;
}

void PlantControl::setMoistureThreshold(int threshold) {
    if (threshold >= 0 && threshold <= 100) {
        _moistureThreshold = threshold;
        
        _preferences.begin("plantcare", false);
        _preferences.putInt("threshold", _moistureThreshold);
        _preferences.end();
        
        Serial.print("Threshold updated and saved to: ");
        Serial.println(_moistureThreshold);
    }
}

int PlantControl::getMoistureThreshold() {
    return _moistureThreshold;
}

void PlantControl::setLastMoisture(int value) {
    _lastMoisture = value;
}

int PlantControl::getLastMoisture() {
    return _lastMoisture;
}
