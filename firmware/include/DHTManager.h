#ifndef DHT_MANAGER_H
#define DHT_MANAGER_H

#include "Config.h"
#include <DHT.h>

class DHTManager {
private:
    DHT* _dht;
    int _pin;
    int _type;

public:
    DHTManager(int pin, int type = DHT22);
    
    void begin();
    
    float getTemperature();
    float getHumidity();
};

#endif
