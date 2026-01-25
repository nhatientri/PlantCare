#include "SensorManager.h"

SensorManager::SensorManager() : dht(DHTPIN, DHTTYPE) {
    for (int pin : SOIL_PINS) {
        sensorPins.push_back(pin);
        currentReadings.push_back({pin, 0, 0});
        snapshotReadings.push_back({pin, 0, 0});
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
        int pct = readSensor(sensorPins[i], raw);
        currentReadings[i] = {sensorPins[i], raw, pct};
    }
}

int SensorManager::readSensor(int pin, int& rawArg) {
    int raw = analogRead(pin);
    rawArg = raw;
    // Map raw to 0-100%
    int percent = map(raw, AIR_VALUE, WATER_VALUE, 0, 100);
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
    DHTReading reading;
    reading.temperature = dht.readTemperature();
    reading.humidity = dht.readHumidity();
    return reading;
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
