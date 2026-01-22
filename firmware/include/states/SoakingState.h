#ifndef SOAKING_STATE_H
#define SOAKING_STATE_H

#include "PlantState.h"

class SoakingState : public PlantState {
private:
    unsigned long _startTime;

public:
    void enter(PlantControl* plant) override;
    void update(PlantControl* plant) override;
    void exit(PlantControl* plant) override;
};

#endif
