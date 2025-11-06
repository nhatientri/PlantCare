import json
import paho.mqtt.client as mqtt

# --- Configuration ---
with open("config.json", "r") as file:
    config = json.load(file)

BROKER = config["mqtt"]["broker"]
PORT = config["mqtt"]["port"]
ACTUATOR_TOPIC = config["mqtt"]["actuator_topic"]
ACTUATOR_STATE_TOPIC = config["mqtt"]["actuator_state_topic"]
DEVICE_ID = "actuator_device_01"


# --- MQTT Callbacks ---

def on_connect(client, userdata, flags, rc):
    """Callback khi kết nối với MQTT broker."""
    print(f"Connected to MQTT broker with code {rc}")
    # Đăng ký chủ đề nơi bộ điều khiển gửi lệnh
    client.subscribe(ACTUATOR_TOPIC)
    print(f"Subscribed to topic: {ACTUATOR_TOPIC} (Waiting for commands...)")


def on_message(client, userdata, msg):
    """Callback khi nhận được tin nhắn."""
    try:
        # Giải mã tin nhắn JSON
        command = json.loads(msg.payload.decode())
        pump_state = command.get("pump")  # Lệnh là "ON" hoặc "OFF"

        # Chuẩn bị tin nhắn xác nhận
        pump_state_message = {"pump_state": "UNKNOWN"}

        if pump_state:
            # In ra lệnh nhận được, mô phỏng hành động
            print(f"--- ACTUATOR COMMAND RECEIVED ---")
            print(f"Pump State: {pump_state}")

            # --- Logic mô phỏng ---
            if pump_state == "ON":
                print("ACTION: The pump is now running")
                pump_state_message["pump_state"] = "RUNNING"  # Trạng thái xác nhận
            elif pump_state == "OFF":
                print("ACTION: The pump is stopped")
                pump_state_message["pump_state"] = "STOPPED"  # Trạng thái xác nhận
            print("---------------------------------\n")

            # Gửi (publish) trạng thái đã xác nhận
            try:
                client.publish(ACTUATOR_STATE_TOPIC, json.dumps(pump_state_message))
                print(f"Published confirmed state to '{ACTUATOR_STATE_TOPIC}': {pump_state_message}")
            except Exception as pub_e:
                print(f"Error publishing state: {pub_e}")

    except Exception as e:
        print(f"Error processing received command: {e}")


# --- Main Execution ---
if __name__ == "__main__":
    # Khởi tạo MQTT client
    client = mqtt.Client(client_id=DEVICE_ID)
    client.on_connect = on_connect
    client.on_message = on_message

    # Kết nối và bắt đầu vòng lặp
    client.connect(BROKER, PORT, 60)
    client.loop_forever()