import sqlite3
import pandas as pd
import plotly.express as px
from flask import Flask, render_template, redirect, url_for
import json
import paho.mqtt.client as mqtt

# --- CONFIGURATION ---
app = Flask(__name__)
# Configuration
with open("config.json", "r") as file:
    config = json.load(file)

DB_FILE = config["database"]
MOISTURE_THRESHOLD = config["thresholds"]["moisture_threshold"]

# --- MQTT SETUP FOR COMMANDS ---
BROKER = config["mqtt"]["broker"]
PORT = config["mqtt"]["port"]
ACTUATOR_TOPIC = config["mqtt"]["actuator_topic"]

# Set up the MQTT client
command_client = mqtt.Client(client_id="dashboard_01")
command_client.connect(BROKER, PORT, 60)
command_client.loop_start()  # Start a background thread


# --- DATA FUNCTIONS ---
def get_sensor_data(limit=200):
    """Fetches the latest sensor data from the SQLite database."""
    try:
        conn = sqlite3.connect(DB_FILE)
        query = f"""
        SELECT timestamp, soil_moisture, temperature, humidity 
        FROM sensor_data 
        ORDER BY timestamp DESC 
        LIMIT {limit}
        """
        df = pd.read_sql_query(query, conn)
        conn.close()

        if df.empty:
            return df

        df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize("UTC").dt.tz_convert("Asia/Ho_Chi_Minh")
        return df.iloc[::-1]
    except Exception as e:
        print(f"Error in get_sensor_data: {e}")
        return pd.DataFrame()


def get_latest_actuator_state():
    """Lấy trạng thái đã xác nhận gần đây nhất từ bảng actuator_log."""
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # <--- THAY ĐỔI: Đã xóa dấu \ bị lỗi
        query = """
                SELECT confirmed_state, timestamp
                FROM actuator_log
                ORDER BY timestamp DESC
                LIMIT 1
                """

        cursor.execute(query)
        state_data = cursor.fetchone()  # Lấy một hàng (state, timestamp)
        conn.close()

        if state_data:
            # Chuyển đổi timestamp sang múi giờ địa phương
            ts = pd.to_datetime(state_data[1], utc=True).tz_convert("Asia/Ho_Chi_Minh")
            return {"state": state_data[0], "timestamp": ts}  # Ví dụ: {"state": "RUNNING", "timestamp": ...}
        else:
            # Mặc định nếu bảng còn trống
            return {"state": "UNKNOWN", "timestamp": None}
    except Exception as e:
        print(f"Error in get_latest_actuator_state: {e}")
        return {"state": "ERROR", "timestamp": None}


def create_plot(df, value_column, title, y_axis_label):
    """Creates a line plot for a specific sensor reading using Plotly."""
    fig = px.line(df,
                  x='timestamp',
                  y=value_column,
                  title=title,
                  line_shape='linear',
                  template="plotly_white")

    if value_column == 'soil_moisture':
        fig.add_hline(y=MOISTURE_THRESHOLD,
                      line_dash="dot",
                      line_color="red",
                      annotation_text=f"Watering Threshold ({MOISTURE_THRESHOLD})",
                      annotation_position="top left")

    fig.update_layout(
        xaxis_title="Time",
        yaxis_title=y_axis_label,
        margin=dict(l=20, r=20, t=40, b=20)
    )
    return fig.to_html(full_html=False, default_height=350, default_width='100%')


# --- FLASK ROUTES ---
@app.route('/')
def index():
    # 1. Fetch the data
    df = get_sensor_data()

    if df.empty:
        # Nếu không có dữ liệu cảm biến, cũng không hiển thị trạng thái bơm
        return render_template('no_data.html')

    # 2. Create the plots
    moisture_plot = create_plot(df, 'soil_moisture', 'Soil Moisture Trend', 'Moisture (ADC Value)')
    temp_plot = create_plot(df, 'temperature', 'Temperature Trend', 'Temperature (°C)')
    humidity_plot = create_plot(df, 'humidity', 'Humidity Trend', 'Humidity (%)')

    # 3. Get the latest reading for a quick summary
    latest = df.iloc[-1]

    confirmed_state_data = get_latest_actuator_state()  # Đây là một dict

    return render_template('dashboard.html',
                           moisture_plot=moisture_plot,
                           temp_plot=temp_plot,
                           humidity_plot=humidity_plot,
                           latest=latest,
                           confirmed_state_data=confirmed_state_data)


@app.route('/actuator_command/<state>')
def actuator_command(state):
    """Receives a command from the web interface and publishes it to MQTT."""
    try:
        state = state.upper()
        if state in ["ON", "OFF"]:
            actuator_state = {"pump": state, "source": "DASHBOARD_MANUAL"}

            command_client.publish(ACTUATOR_TOPIC, json.dumps(actuator_state))
            print(f"MANUAL COMMAND SENT: {actuator_state}")

            return redirect(url_for('index'))
        else:
            return "Invalid command", 400
    except Exception as e:
        print(f"Error publishing command: {e}")
        return "Command error", 500


if __name__ == '__main__':
    app.run(debug=True)