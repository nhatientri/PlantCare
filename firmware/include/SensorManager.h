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
    
    // Fills the provided array with moisture data and returns true if ANY plant needs watering
    bool readSoilMoisture(PlantData* plants, int numPlants, bool& outNeedsWatering);

private:
    DHT dht;
};

#endif
