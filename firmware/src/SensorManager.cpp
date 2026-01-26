#include "SensorManager.h"

SensorManager::SensorManager() : dht(DHTPIN, DHTTYPE) {
    int count = sizeof(SOIL_PINS) / sizeof(SOIL_PINS[0]);
    for (int i = 0; i < count; i++) {
        int pin = SOIL_PINS[i];
        sensorPins.push_back(pin);
        currentReadings.push_back({pin, 0, 0});
        snapshotReadings.push_back({pin, 0, 0});
        
        // Default calibration
        airValues.push_back(1700);
        waterValues.push_back(700);
    }
}

void SensorManager::begin() {
    dht.begin();
    for (int pin : sensorPins) {
        pinMode(pin, INPUT);
    }
}

void SensorManager::update() {
    for (int i = 0; i < sensorPins.size(); i++) {
        int raw = 0;
        int pct = readSensor(i, sensorPins[i], raw);
        currentReadings[i] = {sensorPins[i], raw, pct};
    }
}

int SensorManager::readSensor(int index, int pin, int& rawArg) {
    long sum = 0;
    for(int i=0; i<5; i++) {
        sum += analogRead(pin);
        delay(2); // tiny delay for ADC stability
    }
    int raw = sum / 5;
    
    rawArg = raw;
    // Map raw to 0-100%
    // Use index to get specific calibration. Modulo for safety against out-of-bounds.
    if (index < 0 || index >= airValues.size()) return 0; // Error
    
    int air = airValues[index];
    int water = waterValues[index];

    int percent = map(raw, air, water, 0, 100);
    return constrain(percent, 0, 100);
}

float SensorManager::getAverageMoisture() {
    long sum = 0;
    for (auto& val : currentReadings) {
        sum += val.percent;
    }
    return (float)sum / sensorPins.size();
}

std::vector<SensorDetail> SensorManager::getReadings() {
    return currentReadings;
}

DHTReading SensorManager::getDHT() {
    unsigned long now = millis();
    if (now - lastDHTReadTime > 2000 || lastDHTReadTime == 0) { // Read every 2 seconds min (DHT22 limit)
        // Ideally we don't block here, but DHT lib blocks. 
        // We just ensure we don't call it FASTER than allowed.
        // Actually, let's cache for 10 seconds to improve loop perf.
        if (now - lastDHTReadTime > 10000 || lastDHTReadTime == 0) {
            float t = dht.readTemperature();
            float h = dht.readHumidity();
            if (!isnan(t)) cachedDHT.temperature = t;
            if (!isnan(h)) cachedDHT.humidity = h;
            lastDHTReadTime = now;
        }
    }
    return cachedDHT;
}

void SensorManager::snapshotMoisture() {
    // Copy current readings to snapshot
    snapshotReadings = currentReadings;
}

std::vector<bool> SensorManager::validateRise(int riseThreshold) {
    std::vector<bool> results;
    for (int i = 0; i < sensorPins.size(); i++) {
        int delta = currentReadings[i].percent - snapshotReadings[i].percent;
        results.push_back(delta >= riseThreshold);
    }
    return results;
}

bool SensorManager::checkTankEmpty(const std::vector<bool>& validationResults) {
    // If ALL sensors failed to rise, assume tank is empty
    for (bool rise : validationResults) {
        if (rise) return false; // At least one sensor rose, so tank is NOT empty
    }
    return true; // None rose
}

void SensorManager::setCalibration(int index, int air, int water) {
    if (index >= 0 && index < airValues.size()) {
        airValues[index] = air;
        waterValues[index] = water;
    }
}

int SensorManager::getAirValue(int index) {
    if (index >= 0 && index < airValues.size()) return airValues[index];
    return 1700;
}

int SensorManager::getWaterValue(int index) {
    if (index >= 0 && index < waterValues.size()) return waterValues[index];
    return 700;
}
