#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Preferences.h>
#include <Arduino.h>

class ConfigManager {
private:
    Preferences preferences;
    const char* NAMESPACE = "plantcare";
    // Default calibration values if not set
    // Using widely safe defaults: 1700 (Air), 700 (Water)
    const int DEFAULT_AIR = 1700;
    const int DEFAULT_WATER = 700;

public:
    void begin();
    
    int loadThreshold();
    void saveThreshold(int threshold);
    
    // Calibration for 2 sensors
    int loadAirValue(int index);
    void saveAirValue(int index, int value);
    
    int loadWaterValue(int index);
    void saveWaterValue(int index, int value);
    
    String loadMqttServer();
    void saveMqttServer(String server);
    
    int loadMqttPort();
    void saveMqttPort(int port);

    String loadPassword();
    void savePassword(String password);

    // Time Windows
    int loadMorningStart();
    void saveMorningStart(int hour);
    
    int loadMorningEnd();
    void saveMorningEnd(int hour);
    
    int loadAfternoonStart();
    void saveAfternoonStart(int hour);
    
    int loadAfternoonEnd();
    void saveAfternoonEnd(int hour);

    // Trigger Mode: 0=AVG, 1=ANY, 2=ALL
    int loadTriggerMode();
    void saveTriggerMode(int mode);
};

#endif
