import json
import paho.mqtt.client as mqtt
import sqlite3

# Configuration
with open("config.json", "r") as file:
    config = json.load(file)

BROKER = config["mqtt"]["broker"]
PORT = config["mqtt"]["port"]
SENSOR_TOPIC = config["mqtt"]["sensor_topic"]
ACTUATOR_TOPIC = config["mqtt"]["actuator_topic"]
ACTUATOR_STATE_TOPIC = config["mqtt"]["actuator_state_topic"]

# Thresholds
MOISTURE_THRESHOLD = config["thresholds"]["moisture_threshold"]

# Database Setup
DB_FILE = config["database"]


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Database setup
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS sensor_data
                   (
                       id            INTEGER PRIMARY KEY AUTOINCREMENT,
                       timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP,
                       temperature   REAL,
                       humidity      REAL,
                       soil_moisture REAL,
                       pump_command  TEXT
                   )
                   """)

    # Table for actuator state logs
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS actuator_log
                   (
                       id              INTEGER PRIMARY KEY AUTOINCREMENT,
                       timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
                       confirmed_state TEXT
                   )
                   """)

    conn.commit()
    conn.close()


# Log for sensor data
def log_to_db(temperature, humidity, soil_moisture, pump_command):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
                   INSERT INTO sensor_data (temperature, humidity, soil_moisture, pump_command)
                   VALUES (?, ?, ?, ?)
                   """, (temperature, humidity, soil_moisture, pump_command))
    conn.commit()
    conn.close()


# Log for actuator state
def log_actuator_state(state):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
                   INSERT INTO actuator_log (confirmed_state)
                   VALUES (?)
                   """, (state,))
    conn.commit()
    conn.close()


# MQTT event callbacks
def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT broker with code {rc}")

    client.subscribe(SENSOR_TOPIC)
    print(f"Subscribed to topic: {SENSOR_TOPIC}")

    client.subscribe(ACTUATOR_STATE_TOPIC)
    print(f"Subscribed to topic: {ACTUATOR_STATE_TOPIC}")


def on_sensor_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        print(f"[SENSOR] Received: {data}")

        # --- Simple actuator logic ---
        temperature = data.get("temperature")
        humidity = data.get("humidity")
        soil_moisture = data.get("soil_moisture")

        pump_state = "ON" if soil_moisture < MOISTURE_THRESHOLD else "OFF"

        log_to_db(temperature, humidity, soil_moisture, pump_state)

        actuator_state = {
            "pump": pump_state,
        }

        client.publish(ACTUATOR_TOPIC, json.dumps(actuator_state))
        print(f"[CONTROLLER] Actuator command sent: {actuator_state}\n")

    except Exception as e:
        print(f"Error processing SENSOR message: {e}")


def on_actuator_state_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        confirmed_state = data.get("pump_state")

        if confirmed_state:
            print(f"[ACTUATOR STATE] Received confirmed state: {confirmed_state}")
            log_actuator_state(confirmed_state)

    except Exception as e:
        print(f"Error processing ACTUATOR STATE message: {e}")


if __name__ == "__main__":
    # Initialize database
    init_db()

    # Set up a client
    client = mqtt.Client(client_id="controller_01")
    client.on_connect = on_connect

    # Add callbacks for specific topics
    client.message_callback_add(SENSOR_TOPIC, on_sensor_message)
    client.message_callback_add(ACTUATOR_STATE_TOPIC, on_actuator_state_message)

    # Connect and loop
    client.connect(BROKER, PORT, 60)
    client.loop_forever()