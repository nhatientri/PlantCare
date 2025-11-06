import json
import time
import random
import paho.mqtt.client as mqtt

# Load configuration
with open("config.json", "r") as file:
    config = json.load(file)

broker = config["mqtt"]["broker"]
port = config["mqtt"]["port"]
topic = config["mqtt"]["sensor_topic"]
interval = config["update_interval"]

# MQTT setup
client = mqtt.Client(client_id=config["device_id"])
client.connect(broker, port, 60)

print(f"Connected to MQTT broker at {broker}:{port}")
print(f"Publishing to topic: {topic}")

# Simulate sensor readings
def generate_sensor_data():
    sensors = config["sensors"]
    return {
        "soil_moisture": random.randint(sensors["soil_moisture"]["min"], sensors["soil_moisture"]["max"]),
        "temperature": round(random.uniform(sensors["temperature"]["min"], sensors["temperature"]["max"]), 2),
        "humidity": round(random.uniform(sensors["humidity"]["min"], sensors["humidity"]["max"]), 2),
    }

# Publish loop
while True:
    data = generate_sensor_data()
    client.publish(topic, json.dumps(data))
    print(f"Sent: {data}")
    time.sleep(interval)
