#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <DHT.h>
#include "Config.h"

struct PlantData {
    int index;
    int moisturePercent;
};

class SensorManager {
public:
    SensorManager();
    void setup();
    
    float readTemperature();
    float readHumidity();
    
    // Fills the provided array with moisture data and returns true if valid
    // Updates outNeedsWatering based on the passed threshold
    bool readSoilMoisture(PlantData* plants, int numPlants, int threshold, bool& outNeedsWatering);

    // Checks if ANY plant is dangerously wet (returns true if > SAFE_MAX_MOISTURE)
    bool isAnyPlantWet(int safeThreshold);
    
    // Helper to get average moisture (used for Tank Empty check base value)
    int getAllPlantMoistureAverage();

private:
    DHT dht;
};

#endif
