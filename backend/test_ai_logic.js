const axios = require('axios');

const DEVICE_ID = 'test-device-ai';
const SECRET = 'admin'; // Using default secret
const API_URL = 'http://localhost:3001/api/readings';

async function sendReading(pumpState, moisture) {
    try {
        await axios.post(API_URL, {
            deviceId: DEVICE_ID,
            temperature: 25,
            humidity: 60,
            pumpState: pumpState, // Boolean
            plants: [{ index: 0, moisture: moisture }],
            threshold: 30,
            tankEmpty: false
        }, {
            headers: { 'x-device-secret': SECRET }
        });
        // console.log(`Sent: Pump=${pumpState}, Moisture=${moisture}`);
    } catch (e) {
        console.error("Error sending reading:", e.response ? e.response.data : e.message);
    }
}

async function runTest() {
    console.log("--- STARTING AI LEGACY TEST ---");

    // 1. Initial State (Idle)
    await sendReading(false, 30);
    await new Promise(r => setTimeout(r, 1000));

    // 2. Pump ON (Watering)
    console.log(">>> Turning Pump ON");
    await sendReading(true, 30);
    await new Promise(r => setTimeout(r, 5000));

    // 3. Pump OFF (Start Soak)
    console.log(">>> Turning Pump OFF (Should trigger Soak Timer)");
    await sendReading(false, 30); // Baseline moisture 30

    // 4. Wait 40s (Simulating Soak)
    console.log(">>> Waiting 40s...");

    // Send keep-alive packets during soak (as firmware would)
    for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 5000));
        await sendReading(false, 30); // Moisture stuck at 30 (BAD SCENARIO)
        console.log(`... ${5 * (i + 1)}s elapsed`);
    }

    // 5. Final packet (Should trigger analysis)
    console.log(">>> Final Packet (Should trigger Anomaly)");
    await sendReading(false, 30);

    console.log("--- TEST COMPLETE ---");
    console.log("Check server logs for 'AI: Soak Complete' and 'Pump Anomaly'");
}

runTest();
