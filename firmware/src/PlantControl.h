#ifndef PLANT_CONTROL_H
#define PLANT_CONTROL_H

#include <Arduino.h>
#include "SensorManager.h"
#include "NetworkManager.h"
#include "ConfigManager.h"

enum State {
    IDLE,
    WATERING,
    SOAKING,
    ERROR_TANK_EMPTY,
    ERROR_SENSOR_FAULT
};

class PlantControl {
private:
    int PUMP_PIN = 2;
    State currentState;
    
    SensorManager* sensors;
    NetworkManager* network;
    ConfigManager* config;

    unsigned long stateStartTime;
    const unsigned long WATERING_DURATION = 2000; // 2 seconds
    const unsigned long SOAK_DURATION = 30000;    // 30 seconds
    const int RISE_THRESHOLD = 2; // 2% rise expected

    char failMessage[100];

    void setState(State newState);
    void turnPump(bool on);
    void broadcastStatus();

public:
    PlantControl(SensorManager* s, NetworkManager* n, ConfigManager* c);
    void begin();
    void update();
    void processCommand(const char* topic, const char* payload);
};

#endif
