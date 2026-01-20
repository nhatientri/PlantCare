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

bool SensorManager::readSoilMoisture(PlantData* plants, int numPlants, int threshold, bool& outNeedsWatering) {
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
        
        Serial.printf("Plant %d: %d %% (Limit: %d%%)\n", i, percent, threshold);
        
        if (percent < threshold) {
            outNeedsWatering = true;
        }
    }
    return validReading;
}

bool SensorManager::isAnyPlantWet(int safeThreshold) {
    for(int i=0; i<NUM_PLANTS; i++) {
        int raw = analogRead(MOISTURE_PINS[i]);
        int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
        percent = constrain(percent, 0, 100);
        
        if (percent > safeThreshold) {
            Serial.printf("Safety Block: Plant %d is too wet (%d%%)\n", i, percent);
            return true;
        }
    }
    return false;
}

int SensorManager::getAllPlantMoistureAverage() {
    long sum = 0;
    int count = 0;
    for(int i=0; i<NUM_PLANTS; i++) {
        int raw = analogRead(MOISTURE_PINS[i]);
        if (raw >= SENSOR_MIN_VALID && raw <= SENSOR_MAX_VALID) {
            int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
            sum += constrain(percent, 0, 100);
            count++;
        }
    }
    if (count == 0) return 0;
    return (int)(sum / count);
}
