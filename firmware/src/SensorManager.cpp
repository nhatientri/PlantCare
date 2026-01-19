#include "SensorManager.h"

SensorManager::SensorManager() : dht(DHT_PIN, DHT_TYPE) {
}

void SensorManager::setup() {
    dht.begin();
    for(int i=0; i<NUM_PLANTS; i++) {
        pinMode(MOISTURE_PINS[i], INPUT);
    }
}

float SensorManager::readTemperature() {
    float t = dht.readTemperature();
    return isnan(t) ? 0.0f : t;
}

float SensorManager::readHumidity() {
    float h = dht.readHumidity();
    return isnan(h) ? 0.0f : h;
}

bool SensorManager::readSoilMoisture(PlantData* plants, int numPlants, bool& outNeedsWatering) {
    outNeedsWatering = false;
    
    for(int i=0; i<numPlants; i++) {
        // Validation index check
        // In this loop we assume arrays are correctly sized by main program using NUM_PLANTS
        
        int raw = analogRead(MOISTURE_PINS[i]);
        int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
        percent = constrain(percent, 0, 100);
        
        plants[i].index = i;
        plants[i].moisturePercent = percent;
        
        Serial.printf("Plant %d: %d %%\n", i, percent);
        
        if (percent < MOISTURE_THRESHOLD) {
            outNeedsWatering = true;
        }
    }
    return true;
}
