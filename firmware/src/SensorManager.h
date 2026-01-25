#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <DHT.h>
#include <vector>

#define DHTPIN 4
#define DHTTYPE DHT22

// Soil Sensor Pins (ADC)
const int SOIL_PINS[] = {32, 34}; 
const int NUM_SENSORS = 2;

struct SensorDetail {
    int pin;
    int raw;
    int percent;
};

struct DHTReading {
    float temperature;
    float humidity;
};

class SensorManager {
private:
    DHT dht;
    std::vector<int> sensorPins;
    std::vector<SensorDetail> currentReadings; // calibrated %
    std::vector<SensorDetail> snapshotReadings; // for rise validation

    // Calibration constants (can be moved to ConfigManager later)
    const int AIR_VALUE = 1700;
    const int WATER_VALUE = 700;

    int readSensor(int pin, int& rawArg);

public:
    SensorManager();
    void begin();
    void update();
    
    float getAverageMoisture();
    std::vector<SensorDetail> getReadings();
    DHTReading getDHT();

    // Verification Logic
    void snapshotMoisture();
    // Returns map where key is index, value is boolean (true = rose/OK, false = no rise)
    std::vector<bool> validateRise(int riseThreshold);
    bool checkTankEmpty(const std::vector<bool>& validationResults);
};

#endif
