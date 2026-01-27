# PlantCare: Smart Watering System Design Report

## I. Introduction

### 1. Motivation

Water scarcity is one of the most pressing environmental challenges of the 21st century. Traditional irrigation and plant care methods often rely on fixed schedules or manual estimation, leading to significant inefficiencies. Over-watering not only wastes a precious resource but can also be detrimental to plant health, causing root rot and nutrient leaching. Conversely, under-watering leads to poor growth and crop failure.

The motivation behind the **PlantCare** project is to address this inefficiency through a design-centric approach to automation. By shifting from a schedule-based model to a **demand-based model**, we aim to create a system that waters plants only when strictly necessary. This "Smart Watering System" utilizes real-time soil moisture monitoring and environmental data to make intelligent decisions. The primary goal is to drastically reduce wasteful water consumption while simultaneously optimizing plant health, demonstrating how IoT technology can promote sustainable agricultural and gardening practices.

### 2. Objectives

To achieve the vision of a smart, design-led watering system, this project focuses on the following key objectives:

1.  **Design a Scalable IoT Architecture**: To construct a modular system where the backend, frontend, and firmware components are decoupled yet synchronized. This ensures that the system can support multiple sensor nodes (devices) without requiring significant architectural changes.
2.  **Implement Reliable Real-Time Communication**: To establish a low-latency data pipeline using MQTT for device-to-server communication and WebSockets for server-to-client updates. The design priority is measuring and maintaining the freshness of state (sensor readings).
3.  **Develop an Intuitive Monitoring Interface**: To create a user-friendly React-based dashboard that transforms raw sensor data (moisture %, temperature) into meaningful visualizations, allowing users to make informed decisions at a glance.
4.  **Engineer Fail-Safe Automation Logic**: To design firmware logic that handles decision-making locally on the ESP32. The system must autonomously regulate water flow based on sensor thresholds while incorporating safety guards (e.g., maximum pump runtime) to prevent hardware failure or flooding.

## II. Methodology

### 1. Plant Selection

The first step in designing the validation protocol for the PlantCare system was selecting appropriate biological test subjects. The core requirement was to choose plant species that would act as effective **biological indicators**, allowing for immediate visual verification of the system's performance. The concept of using plants as "biosensors" is well-established in precision agriculture, where physiological responses are used to trigger irrigation events [1].

We selected **Mint (*Mentha*)** and **Basil (*Ocimum basilicum*)** for this project. This decision was driven by their specific physiological attributes:

*   **Rapid Turgor Pressure Response**: Both species exhibit dramatic and immediate wilting when water-stressed. This is due to a loss of **turgor pressure**—the hydrostatic pressure within cells that pushes against the cell wall to maintain rigidity [2]. When water is scarce, this pressure drops, causing the plant to droop visually [3]. This "fainting" behavior serves as a clear, binary visual signal that allows us to cross-reference sensor data with the actual physical state of the plant.
*   **High Sensitivity**: These herbs are sensitive to soil moisture fluctuations. They do not tolerate drought well, meaning the system's responsiveness is constantly tested. If the system fails or lags, the plants will visually indicate failure within hours, not days.
*   **Fast Growth Cycle**: Their rapid growth rate allows us to observe not just immediate survival, but also the long-term health benefits of optimized watering over the short duration of the project.

By choosing these high-maintenance plants, we intentionally stressed the system designs to ensure that the automation logic could handle strict moisture requirements reliably.

### 2. Hardware Selection

The hardware architecture was chosen to prioritize modularity, reliability, and autonomy. Each component was selected to address specific engineering challenges identified in the planning phase.

#### 2.1. Microcontroller: ESP32 vs. Arduino Nano
While the Arduino Nano is a standard choice for simple automation, we selected the **ESP32** for its integrated Wi-Fi and Bluetooth capabilities. The critical requirement driving this decision was the need for **Over-The-Air (OTA) firmware updates**. In a real-world agricultural deployment, devices are often physically inaccessible (e.g., inside a greenhouse or enclosed casing). The ESP32 allows us to push code updates remotely without disassembling the enclosure, a feature not natively supported by the standard Arduino Nano [4]. Additionally, the ESP32's dual-core architecture allows us to dedicate one core to network communications and the other to sensor logic, ensuring that heavy network traffic does not interrupt the timing of pump control.

#### 2.2. Actuation: 12V Diaphragm Pump & Relay
To ensure the system could operate in various physical configurations, we selected a **12V self-priming diaphragm pump**. Unlike centrifugal pumps, diaphragm pumps can create a vacuum to draw water from below the pump level ("self-priming") and can run dry for short periods without damage [5]. This allows the water reservoir to be placed on the floor while the electronics sit on a shelf. A **12V Relay Module** acts as the interface between the low-voltage logic (3.3V from ESP32) and the high-power circuit (12V) for the pump, providing necessary galvanic isolation to protect the microcontroller.

#### 2.3. Sensing: Capacitive vs. Resistive Soil Moisture Sensors
A common point of failure in DIY irrigation systems is the corrosion of sensor probes. We explicitly chose **Capacitive Soil Moisture Sensors** over standard Resistive sensors. Resistive sensors operate by passing a DC current through the soil, which causes rapid electrolysis and corrosion of the electrodes, often failing within weeks [6]. Capacitive sensors, conversely, measure changes in dielectric permittivity and do not expose metal electrodes to the soil, significantly extending their operational lifespan and reliability.

> **Hardware Abstraction**: Initial tests revealed that affordable capacitive sensors exhibit significant manufacturing variance (up to 15% difference in ADC readings). To address this, we implemented **Per-Sensor Calibration** in the firmware. A lookup table stores specific `Air` (0%) and `Water` (100%) ADC limits for each sensor node, ensuring that "50%" means the same physical wetness for every plant regardless of hardware quirks.

#### 2.4. Power System: Portable 12V Ecosystem
To make the system a fully self-contained unit, it is powered by a **12V Rechargeable Battery**, managed by a portable battery charger. This "enclosed ecosystem" design decoupling the system from wall outlets, allowing it to be deployed in balconies or gardens where mains power is unavailable. The 12V standard unifies the power requirements for both the high-torque pump and the microcontroller (stepped down to 5V/3.3V).

#### 2.5. Physical Configuration: The Garden Zone
To standardize the testing environment, the system is organized into a **Garden Zone** topology.
*   **Zone Definition**: Each zone consists of **2 plants of the same species** (e.g., 2 Mint plants). This pairing ensures that both plants share identical biological water requirements.
*   **Actuation Logic**: A single 5V water pump drives the irrigation for the entire zone simultaneously. This ensures both plants receive identical hydration cycles, enabling valid comparative analysis (A vs. B) and simplifying the control logic.

**Irrigation Loop Design**:
*   **Reservoir**: A **5-liter opaque water tank** is used. The opacity prevents algae growth (photosynthesis) which could otherwise clog the pump intake.
*   **Distribution**: Water is routed through **6mm silicone tubing** to a T-splitter, dividing the flow equally between the two pots.
*   **Delivery**: We utilize **drip stakes** positioned directly at the base of the stems. This "Root Zone Targeting" prevents foliage wetting, which is critical for fungal disease prevention (especially in Basil) and minimizes evaporative loss [7].

**Sensor Installation**:
*   **Placement**: Sensors are inserted vertically to a depth of **5-7cm**, positioned midway between the plant stem and the pot rim. This specific placement avoids "edge effects" (thermal/moisture bias from the pot walls) while ensuring an average reading of the root ball volume [8].

## References

[1] Agriculture Victoria, "Using plants as biological indicators for irrigation automation," *ExtensionAus*, [Online]. Available: https://extensionaus.com.au/irrigatingag/using-plants-as-biological-indicators-for-irrigation-automation/.
[2] "Turgor pressure," *Encyclopaedia Britannica*.
[3] S. B. Bhattacharya, "Wilting in Plants: Causes and Recovery," *Study.com*.
[4] Espressif Systems, "ESP32 Technical Reference Manual," 2023.
[5] X. Zhang et al., "Design of automatic irrigation system based on LoRa," *IEEE*, 2017.
[6] DF Robot, "Capacitive Soil Moisture Sensor v1.2," *Product Wiki*.
[7] T. A. Zitter, "Vegetable MD Online: Basil Diseases," *Cornell University Department of Plant Pathology*.
[8] C. Rosen, "Potting Soil and Environmental Effects on Measurements," *HortScience*, vol. 42, no. 4, 2007.

## III. System Design

To achieve reliable automation, the system logic deviates from simple "if-this-then-that" rules. Instead, it employs a **Finite State Machine (FSM)** and a **Pulse-and-Soak** algorithm to mimic human gardening intuition.

### 1. Operational Logic: "Pulse and Soak" Finite State Machine
A common issue in automated systems is "overshoot," where the pump runs until the sensor detects wet soil. Because water takes time to percolate through soil, the bottom (where the sensor is) gets wet long after the top is flooded. To prevent this, our system uses a **Finite State Machine (FSM)** with a disparate control cycle.

```mermaid
graph TD
    A[IDLE State] --> G{Sensor Valid?}
    G -->|No| H[Error: Sensor Fault]
    G -->|Yes| I{Needs Water?}
    I -->|Yes & Time OK| B(WATERING State)
    B -->|Pump On: 2 Seconds| C(SOAKING State)
    C -->|Wait: 30 Seconds| D{Check Moisture Rise}
    D -->|ALL Sensors No Rise| E[Error: Tank Empty]
    D -->|Any Sensor Rose| F{Is Soil Content?}
    F -->|Yes| A
    F -->|No & Cycles < 3| B
    F -->|No & Cycles >= 3| A
```

The cycle consists of three primary states:

1.  **IDLE**: The system monitors sensors, time limits, and safety guards (e.g., max daily limit). It only transitions when all "Safe to Water" conditions are met.
2.  **WATERING (Burst)**: The pump activates for a precise duration (**2 seconds**). This minimizes runoff.
3.  **SOAKING**: The pump pauses for **30 seconds** to allow water diffusion. After this state, the system logic evaluates whether to trigger another burst or return to IDLE.

This cycle ensures that water is applied efficiently, preventing root rot and enabling the "Tank Empty" logic (checking for moisture rise during the Soak phase).

### 2. Decision Parameters: When to Water
The system does not water based on dryness alone. It evaluates multiple constraints before activating the pump:
*   **Moisture Threshold**: The primary trigger. User-configurable (default: **30%**).
*   **Time of Day (Circadian Rhythm)**: Watering is restricted to optimal biological windows: **Morning (6:00–9:00)** and **Evening (17:00–20:00)**. This prevents evaporation loss during midday heat and fungal growth from wet foliage at night.
*   **Safety Guard (Max Moisture)**: If any sensor reports >85% moisture (potential flooding or sensor fault), watering is globally disabled.

```mermaid
flowchart TD
    Start([Sensor Reading]) --> CheckThresh{Moisture < Threshold?}
    CheckThresh -->|No| Idle[IDLE: Plant Satisfied]
    CheckThresh -->|Yes| CheckSafe{Safety Guard?}
    CheckSafe -->|Fail: Sensor > 85%| SafeStop[BLOCK: Safety Stop]
    CheckSafe -->|Pass| CheckTime{Time Window?}
    CheckTime -->|Morning/Evening| PumpOn[ACTIVATE PUMP]
    CheckTime -->|Night/Midday| WaitTime[WAIT: Optimal Window]
    
    style PumpOn fill:#9f9,stroke:#333,stroke-width:2px
    style SafeStop fill:#f99,stroke:#333,stroke-width:2px
```

> **Note**: The system includes a **Manual Override** feature via the dashboard. This command (`PUMP_ON`) bypasses all decision parameters (Time Windows, Thresholds, and Safety Guards) to allow for maintenance or emergency watering.

### 3. Fail-Safe: Tank Empty Detection
Traditional systems rely on expensive float switches to detect empty water tanks. Our design eliminates this hardware cost by using **software inference**.
*   **Logic**: If the pump runs for a cycle (Pulse + Soak), water physics dictates that soil moisture *must* increase.
*   **Detection**: The system compares the moisture level *before* the burst vs. *after* the soak. If the average moisture fails to rise by a significant margin (**>2%**, defined as `TANK_CHECK_TOLERANCE`), it implies no water was delivered.
*   **Alert**: After 2 consecutive failures, the system assumes the tank is empty/pump has failed, locks itself in a "Safety Stop" mode, and sends a critical alert to the user dashboard.

### 4. Adaptive Trigger Logic
To accommodate different plant arrangements, the system supports configurable **Trigger Modes**, managed via the `ConfigManager`:
*   **AVG Mode (Default)**: Uses the *average* moisture of all sensors. Best for identical plants in a shared bed.
*   **ANY Mode (Sensitive)**: Triggers if *any single plant* drops below the threshold. Prioritizes the driest plant (useful for water-sensitive species like Mint).
*   **ALL Mode (Conservative)**: Triggers only when *all plants* are dry. Prevents over-watering if one sensor is an outlier.

### 5. Active Sensor Health Monitoring
To improve system resilience, we implemented an **Active Health Check** for the sensors. In typical DIY designs, a disconnected wire results in a floating value that might trigger flooding.
*   **Range Validation**: The system defines a "Valid Window" for ADC readings (100–4000).
*   **Error Flagging**: Readings outside this range (e.g., 0 for short, 4095 for open circuit) immediately flag the active sensor as `INVALID`.
*   **Response**: The system **inhibits watering** for the affected plant and explicitly reports `status: "error"` to the backend. This allows the user to identify exactly which sensor is faulty via the dashboard, rather than inferring it from wet/dry symptoms.



## IV. System Implementation

While the ESP32 handles the immediate physical control, the intelligence of the system resides in the **Application Layer**. The software architecture is designed as a **Microservices-lite** approach, decoupling the data ingestion from the user interface.

### 1. Backend Architecture
The backend is not merely a data store but a sophisticated **Real-Time Gateway** and **Intelligence Engine**. It is architected to handle high-frequency sensor data while maintaining data integrity for historical analysis.

#### 1.1. Database Design (PostgreSQL)
We selected **PostgreSQL** for its robustness and support for hybrid relational/document storage. The schema is normalized to support secure multi-tenancy while retaining flexibility for sensor data.

*   **USERS Table**: Acts as the **Security Root**. It stores user identities and hashed passwords (`bcrypt`), ensuring that access to the system is authenticated and secure.
*   **DEVICES Table**: Manages **Ownership and Access Control**. By linking a unique `device_id` to a `user_id`, the system enforces strict data isolation—User A cannot control or view User B's garden. It also stores the `secret_key` used for device authentication.
*   **READINGS Table**: The **Time-Series Ledger**. Instead of using rigid columns for every sensor type, it utilizes a **JSONB** column (`sensor_data`). This "NoSQL-in-SQL" design allows the firmware to send arbitrary data structures (e.g., adding a Light or pH sensor) without requiring complex backend schema migrations, ensuring the system is "Future-Proof."

```mermaid
erDiagram
    USERS ||--o{ DEVICES : owns
    DEVICES ||--o{ READINGS : generates
    
    USERS {
        int id PK
        string username
        string password_hash
    }
    
    DEVICES {
        string device_id PK
        int user_id FK
        string secret_key
    }
    
    READINGS {
        int id PK
        string device_id FK
        jsonb sensor_data "Flexible Payload"
        timestamp created_at
    }
```

#### 1.2. Protocol Translation Layer
The core function of the backend is bridging the gap between the constrained IoT network (MQTT) and the user-facing web network (HTTP/WebSockets).
*   **The Problem**: Browsers cannot directly subscribe to MQTT topics easily, and opening thousands of HTTP connections from the ESP32 would drain its battery and memory.
*   **The Solution**: The Node.js server acts as a translator.
    1.  **Ingestion**: It connects to the MQTT Broker as a subscriber (`plantcare/+/readings`).
    2.  **Processing**: It validates the incoming binary payload and injects server-side metadata (timestamps).
    3.  **Broadcasting**: It pushes the processed JSON object to connected React clients via **Socket.io**.

This architecture ensures "Loose Coupling"—the ESP32 doesn't know or care about the web dashboard, it just reports its status.

```mermaid
sequenceDiagram
    participant ESP32
    participant MQTT as MQTT Broker
    participant Node as Node.js Server
    participant DB as PostgreSQL
    participant React as Frontend UI

    ESP32->>MQTT: Publish {moisture: 45%}
    MQTT->>Node: Forward Message
    Node->>DB: INSERT INTO readings
    Note over Node,React: Real-Time Push (No Refresh)
    Node->>React: Socket.emit('reading')
    React->>React: Update Chart
```

### 2. Frontend Interface: A Complete IoT Dashboard
The user interface is built as a **Single Page Application (SPA)** using **React.js** (Vite) and TailwindCSS. It goes beyond simple visualization, offering a full suite of management tools:

*   **User Authentication & Security**:
    *   Secure **Login/Registration** flow.
    *   **Device Claiming**: Users can add new ESP32 units to their account using a unique `secret_key`, ensuring unauthorized neighbors cannot control the pump.
*   **Real-Time Visualization**:
    *   **Live Charts**: Uses **Recharts** to Stream soil moisture data via WebSockets.
    *   **Predictive Analytics**: Computes a **Linear Regression** on the client-side to estimate the **"Time to Empty"** (Hours until dry), giving users a proactive forecast rather than just a current status.
    *   **Time Travel**: Users can toggle between **1-Hour** (Real-time), **24-Hour** (Daily Cycle), and **7-Day** (Trends) views.
*   **Device Configuration**:
    *   **Renaming**: Users can set custom nicknames (e.g., "Bedroom Mint") for easier identification.
    *   **Scheduling**: A graphical **Time Window Editor** allows setting specific "Active Hours" (e.g., 06:00-09:00).
    *   **Trigger Modes**: Users can switch the watering logic between **AVG** (default), **ANY** (sensitive), and **ALL** (conservative) directly from the UI.
*   **Command & Control**:
    *   **Manual Override**: A "Water Now" button bypasses the scheduler for emergency hydration.
    *   **Diagnostics**: The dashboard flags sensor errors (e.g., "Sensor 2 Disconnected") and allows remote **System Resets** to clear safety locks.

### 3. Infrastructure & Security
*   **Docker Containerization**: The entire backend stack (Node.js API + PostgreSQL) is containerized using **Docker Compose**. This ensures environment consistency and allows for "One-Command Deployment" (`docker-compose up -d`) on any host machine (e.g., Raspberry Pi, VPS).
*   **User Management**: The system includes a secure authentication system (`bcrypt` hashing) allowing users to manage their profiles and change passwords.
*   **Data Sovereignty**: A "Clear History" feature allows users to wipe their stored sensor data, ensuring privacy and control over their digital footprint.

## V. Results and Verification
I have successfully tested all the watering functionality and confirmed that it works as intended. The system correctly reads sensor data, triggers the pump based on the configured thresholds, and adheres to the "Pulse and Soak" timing logic. The fail-safe mechanisms (Safety Lock and Tank Empty detection) also function correctly to prevent system hazards.

## VI. Conclusion
The "PlantCare" system successfully demonstrates that high-end agricultural principles—specifically **Pulse-and-Soak irrigation**, **Root Zone Targeting**, and **Predictive Analytics**—can be scaled down to a cost-effective IoT solution for home gardens.

By decoupling the hardware logic (ESP32) from the application intelligence (Node.js/React), we achieved a system that is both **resilient** (operating autonomously if the Wi-Fi fails) and **intelligent** (providing rich data and control when connected). The shift from schedule-based to demand-based watering not only improves plant health but represents a significant step towards water-efficient precision agriculture.

## VII. Future Work
*   **Expansion**: Integration of Light (PAR) and Temperature sensors to calculate VPD (Vapor Pressure Deficit) for even more precise irrigation tuning.
*   **Solar Power**: Implementing deep-sleep optimization to run the ESP32 entirely on a 5W solar panel.
