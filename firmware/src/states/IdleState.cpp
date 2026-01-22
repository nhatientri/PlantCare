#include "states/IdleState.h"
#include "states/WateringState.h" // Transition to
#include "PlantControl.h"

void IdleState::enter(PlantControl* plant) {
    Serial.println("State: IDLE");
}

void IdleState::update(PlantControl* plant) {
    // Check Sensor
    int moisture = plant->getSensor()->getMoisturePercentage();
    
    // Log occasionally (simple timer mechanism)
    static unsigned long lastLog = 0;
    if (millis() - lastLog > 5000) {
        Serial.print("Moisture: ");
        Serial.print(moisture);
        Serial.println("%");
        lastLog = millis();
    }
    
    // Check Threshold
    if (moisture < plant->getMoistureThreshold()) {
        // Prepare for watering cycle
        plant->setLastMoisture(moisture); // Snapshot for tank check
        plant->changeState(new WateringState());
    }
}

void IdleState::exit(PlantControl* plant) {
    // Cleanup if needed
}
