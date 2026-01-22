#include "states/WateringState.h"
#include "states/SoakingState.h"
#include "PlantControl.h"

void WateringState::enter(PlantControl* plant) {
    Serial.println("State: WATERING");
    plant->getPump()->turnOn();
    _startTime = millis();
}

void WateringState::update(PlantControl* plant) {
    // Check if burst duration passed
    if (millis() - _startTime >= PUMP_BURST_DURATION_MS) {
        // Transition to Soaking
        plant->changeState(new SoakingState());
    }
}

void WateringState::exit(PlantControl* plant) {
    plant->getPump()->turnOff(); // Ensure pump is OFF when leaving this state
}
