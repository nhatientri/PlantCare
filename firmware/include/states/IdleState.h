#ifndef IDLE_STATE_H
#define IDLE_STATE_H

#include "PlantState.h"

class IdleState : public PlantState {
public:
    void enter(PlantControl* plant) override;
    void update(PlantControl* plant) override;
    void exit(PlantControl* plant) override;
};

#endif
