#ifndef PLANT_STATE_H
#define PLANT_STATE_H

#include <Arduino.h>

// Forward declaration to avoid circular dependency
class PlantControl;

class PlantState {
public:
    virtual void enter(PlantControl* plant) = 0;
    virtual void update(PlantControl* plant) = 0;
    virtual void exit(PlantControl* plant) = 0;
    virtual ~PlantState() {}
};

#endif
