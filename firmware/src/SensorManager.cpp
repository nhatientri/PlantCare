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
    
    bool validReading = true;
    for(int i=0; i<numPlants; i++) {
        int raw = analogRead(MOISTURE_PINS[i]);
        
        // Sanity Check
        if (raw < SENSOR_MIN_VALID || raw > SENSOR_MAX_VALID) {
            Serial.printf("Error: Plant %d sensor reading %d is invalid/disconnected!\n", i, raw);
            validReading = false;
            // We set moisture to 100% (Wet) to prevent accidental watering
            plants[i].moisturePercent = 100; 
            continue; 
        }

        int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
        percent = constrain(percent, 0, 100);
        
        plants[i].index = i;
        plants[i].moisturePercent = percent;
        
        Serial.printf("Plant %d: %d %%\n", i, percent);
        
        if (percent < MOISTURE_THRESHOLD) {
            outNeedsWatering = true;
        }
    }
    return validReading;
}
