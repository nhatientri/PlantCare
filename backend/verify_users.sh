#!/bin/bash

BASE_URL="http://localhost:3001"

# Helper function to extract token using node
get_token() {
  node -pe "try { JSON.parse(fs.readFileSync(0)).token } catch(e) { '' }"
}

echo "1. Register User A"
curl -s -X POST -H "Content-Type: application/json" -d '{"username":"userA","password":"password"}' $BASE_URL/api/auth/register
echo -e "\n"

echo "2. Login User A"
TOKEN_A=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"userA","password":"password"}' $BASE_URL/api/auth/login | node -pe "JSON.parse(fs.readFileSync(0)).token")
echo "Token A: $TOKEN_A"

echo "3. Register User B"
curl -s -X POST -H "Content-Type: application/json" -d '{"username":"userB","password":"password"}' $BASE_URL/api/auth/register
echo -e "\n"

echo "4. Login User B"
TOKEN_B=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"userB","password":"password"}' $BASE_URL/api/auth/login | node -pe "JSON.parse(fs.readFileSync(0)).token")
echo "Token B: $TOKEN_B"

echo "5. User A claims Device 1 (ESP32-A)"
curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"deviceId":"ESP32-A", "name":"My Plant"}' $BASE_URL/api/devices/claim
echo -e "\n"

echo "6. User B claims Device 1 (Should fail)"
curl -s -X POST -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -d '{"deviceId":"ESP32-A", "name":"Stolen Plant"}' $BASE_URL/api/devices/claim
echo -e "\n"

echo "7. User B claims Device 2 (ESP32-B)"
curl -s -X POST -H "Authorization: Bearer $TOKEN_B" -H "Content-Type: application/json" -d '{"deviceId":"ESP32-B", "name":"B Plant"}' $BASE_URL/api/devices/claim
echo -e "\n"

echo "8. Post data for Device 1"
curl -s -X POST -H "Content-Type: application/json" -d '{"deviceId":"ESP32-A", "temperature":25, "humidity":60, "pumpState":false, "plants":[{"index":0, "moisture":50}]}' $BASE_URL/api/readings
echo -e "\n"

echo "9. Post data for Device 2"
curl -s -X POST -H "Content-Type: application/json" -d '{"deviceId":"ESP32-B", "temperature":28, "humidity":55, "pumpState":false, "plants":[{"index":0, "moisture":30}]}' $BASE_URL/api/readings
echo -e "\n"

echo "10. User A Get Readings"
curl -s -X GET -H "Authorization: Bearer $TOKEN_A" "$BASE_URL/api/readings?limit=5"
echo -e "\n"

echo "11. User B Get Readings"
curl -s -X GET -H "Authorization: Bearer $TOKEN_B" "$BASE_URL/api/readings?limit=5"
echo -e "\n"

echo "12. User A sends command to Device 1"
curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"deviceId":"ESP32-A", "command":"PUMP_ON"}' $BASE_URL/api/commands
echo -e "\n"

echo "13. User A sends command to Device 2 (Should Fail)"
curl -s -X POST -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d '{"deviceId":"ESP32-B", "command":"PUMP_ON"}' $BASE_URL/api/commands
echo -e "\n"
