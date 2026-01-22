#include "states/SoakingState.h"
#include "states/IdleState.h"
#include "states/WateringState.h"
#include "PlantControl.h"

void SoakingState::enter(PlantControl* plant) {
    Serial.println("State: SOAKING");
    _startTime = millis();
}

void SoakingState::update(PlantControl* plant) {
    // Wait for soak duration
    if (millis() - _startTime >= PUMP_SOAK_DURATION_MS) {
        
        // 1. Check if watering was effective (Tank Empty Check)
        int currentMoisture = plant->getSensor()->getMoisturePercentage();
        int previousMoisture = plant->getLastMoisture();
        
        int rise = currentMoisture - previousMoisture;
        if (rise < TANK_CHECK_TOLERANCE_PERCENT) {
            Serial.println("WARNING: Moisture did not rise! Tank might be empty.");
            // Ideally trigger an ErrorState here, but for now we just log and continue
        } else {
            Serial.print("Moisture rose by ");
            Serial.print(rise);
            Serial.println("%");
        }
        
        // 2. Decide next state
        if (currentMoisture >= plant->getMoistureThreshold()) {
            Serial.println("Target reached. Returning to IDLE.");
            plant->changeState(new IdleState());
        } else {
            Serial.println("Still dry. Pumping again.");
            plant->setLastMoisture(currentMoisture); // New baseline
            plant->changeState(new WateringState());
        }
    }
}

void SoakingState::exit(PlantControl* plant) {
    // Cleanup
}
