#include "SensorManager.h"

SensorManager::SensorManager() : dht(DHT_PIN, DHT_TYPE) {
}

void SensorManager::setup() {
    dht.begin();
    for(int i=0; i<NUM_PLANTS; i++) {
        pinMode(MOISTURE_PINS[i], INPUT);
    }
}

// Update all sensors
void SensorManager::update() {
    // 1. Read DHT
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    cachedTemp = isnan(t) ? 0.0f : t;
    cachedHumidity = isnan(h) ? 0.0f : h;

    // 2. Read Soil Sensors
    for(int i=0; i<NUM_PLANTS && i<10; i++) {
        int raw = analogRead(MOISTURE_PINS[i]);
        Serial.printf("Plant %d (pin %d) raw ADC: %d\n", i, MOISTURE_PINS[i], raw);
        
        if (raw < SENSOR_MIN_VALID || raw > SENSOR_MAX_VALID) {
            Serial.printf("Error: Plant %d sensor reading %d is invalid/disconnected!\n", i, raw);
            cachedMoistureValid[i] = false;
            cachedMoisture[i] = 100; // Default to Wet for safety
        } else {
            int percent = map(raw, MOISTURE_AIR, MOISTURE_WATER, 0, 100);
            cachedMoisture[i] = constrain(percent, 0, 100);
            cachedMoistureValid[i] = true;
        }
    }
}

float SensorManager::readTemperature() {
    return cachedTemp;
}

float SensorManager::readHumidity() {
    return cachedHumidity;
}

bool SensorManager::readSoilMoisture(PlantData* plants, int numPlants, int threshold, bool& outNeedsWatering) {
    outNeedsWatering = false;
    bool allValid = true;
    
    for(int i=0; i<numPlants && i<10; i++) {
        plants[i].index = i;
        plants[i].pin = MOISTURE_PINS[i];
        plants[i].moisturePercent = cachedMoisture[i];
        
        if (!cachedMoistureValid[i]) allValid = false;

        Serial.printf("Plant %d: %d %% (Limit: %d%%)\n", i, cachedMoisture[i], threshold);
        
        if (cachedMoisture[i] < threshold) {
            outNeedsWatering = true;
        }
    }
    return allValid;
}

bool SensorManager::isAnyPlantWet(int safeThreshold) {
    for(int i=0; i<NUM_PLANTS && i<10; i++) {
        if (cachedMoisture[i] > safeThreshold) {
            // Serial.printf("Safety Block: Plant %d is too wet (%d%%)\n", i, cachedMoisture[i]); // Too spammy
            return true;
        }
    }
    return false;
}

int SensorManager::getAllPlantMoistureAverage() {
    long sum = 0;
    int count = 0;
    for(int i=0; i<NUM_PLANTS && i<10; i++) {
        if (cachedMoistureValid[i]) {
            sum += cachedMoisture[i];
            count++;
        }
    }
    if (count == 0) return 0;
    return (int)(sum / count);
}
