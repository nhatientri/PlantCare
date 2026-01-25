#ifndef CONFIG_MANAGER_H
#define CONFIG_MANAGER_H

#include <Preferences.h>
#include <Arduino.h>

class ConfigManager {
private:
    Preferences preferences;
    const char* NAMESPACE = "plantcare";

public:
    void begin();
    
    int loadThreshold();
    void saveThreshold(int threshold);
    
    String loadMqttServer();
    void saveMqttServer(String server);
    
    int loadMqttPort();
    void saveMqttPort(int port);
};

#endif
