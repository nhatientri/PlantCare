#ifndef PLANT_CONTROL_H
#define PLANT_CONTROL_H

#include "Config.h"
#include "SensorManager.h"
#include "DHTManager.h"
#include "PumpController.h"
#include "states/PlantState.h"
#include <Preferences.h>

class PlantControl {
private:
    SensorManager* _sensor;
    DHTManager* _dht;
    PumpController* _pump;
    PlantState* _currentState;
    Preferences _preferences;
    
    // Dynamic Settings
    int _moistureThreshold;
    
    // Helper to store last moisture reading for "Tank Empty" check
    int _lastMoisture;

public:
    PlantControl(SensorManager* sensor, PumpController* pump, DHTManager* dht);
    
    void begin();
    void update();
    
    void changeState(PlantState* newState);
    
    // Accessors for Components
    SensorManager* getSensor();
    PumpController* getPump();
    DHTManager* getDHT();
    
    // Configuration
    void setMoistureThreshold(int threshold);
    int getMoistureThreshold();
    
    // Data passing between states
    void setLastMoisture(int value);
    int getLastMoisture();
};

#endif
