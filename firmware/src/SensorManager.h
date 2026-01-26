#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>
#include <DHT.h>
#include <vector>

#define DHTPIN 4
#define DHTTYPE DHT22

// Soil Sensor Pins (ADC)
const int SOIL_PINS[] = {32, 34}; 
// NUM_SENSORS is now dynamic based on SOIL_PINS array size calculated in cpp

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

    // Cache
    DHTReading cachedDHT = {0, 0};
    unsigned long lastDHTReadTime = 0;

    // Calibration constants (can be moved to ConfigManager later)
    // Calibration Values (Dynamic)
    std::vector<int> airValues; 
    std::vector<int> waterValues;

    int readSensor(int index, int pin, int& rawArg);

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

    // Dynamic Calibration
    void setCalibration(int index, int air, int water);
    int getAirValue(int index);
    int getWaterValue(int index);
};

#endif
