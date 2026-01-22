#include "DHTManager.h"

DHTManager::DHTManager(int pin, int type) : _pin(pin), _type(type) {
    _dht = new DHT(pin, type);
}

void DHTManager::begin() {
    _dht->begin();
}

float DHTManager::getTemperature() {
    return _dht->readTemperature();
}

float DHTManager::getHumidity() {
    return _dht->readHumidity();
}
