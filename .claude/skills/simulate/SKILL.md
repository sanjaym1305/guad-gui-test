---
name: simulate
description: Start the GUAD Pod Telemetry simulator to populate dummy sensor data into the Dockerized app running on localhost. Use when you need to test the UI with realistic sensor data without STM32 hardware.
user-invocable: true
argument-hint: "[interval_ms]"
allowed-tools: Bash Read
---

# GUAD Pod Telemetry Simulator

Populate the Dockerized app with dummy sensor data packets. Default interval is 500ms. Override with: `/simulate 1000`

## Steps

### 1. Verify Docker containers are running

```bash
docker ps --format '{{.Names}} {{.Status}}' | grep guad
```

- Expect to see `guad-backend` and `guad-frontend` both running
- If not running, start them:
  ```bash
  cd /Users/nikhilsaravanan/gui2/GUI && docker-compose up --build -d
  ```
- Wait for backend health check to pass before proceeding

### 2. Verify backend health

```bash
curl -s http://localhost:5001/api/health
```

- Expect: `{"status":"ok","mongodb":"connected"}`
- If MongoDB shows `"disconnected"`, check `docker logs guad-backend` for connection errors
- If connection refused, wait a few seconds and retry (backend may still be starting)

### 3. Ensure dependencies are installed

```bash
cd /Users/nikhilsaravanan/gui2/GUI/guad-gui/server && npm install --silent
```

### 4. Start the simulator

Run in background so it doesn't block the conversation:

```bash
cd /Users/nikhilsaravanan/gui2/GUI/guad-gui/server && node testing/serial-simulator.js ${ARGUMENTS:-500} http://localhost:5001/api/sensor-data
```

- Use `$ARGUMENTS` as the interval in ms (default: 500ms)
- The simulator sends 1 packet every interval, cycling through all 6 types:
  1. IMU Gyroscope (9 values)
  2. IMU Accelerometer (9 values)
  3. Gap Height (8 values)
  4. Temperature (10 values)
  5. Hall Effect (12 values)
  6. Battery Voltages (144 values)
- Simulates pod state transitions (Initialization -> Health Check -> Ready -> Levitation -> Propulsion -> Coasting -> Braking -> Stopped)

### 5. Verify data is flowing

After a few seconds, check:

```bash
curl -s 'http://localhost:5001/api/sensor-data?limit=1'
```

- Expect a JSON response with `"success": true` and recent sensor data
- If no data, check simulator output for connection errors

### 6. Confirm UI is updating

Use Playwright to snapshot `http://localhost` and verify:
- Sensor values are non-zero and changing
- Pod state is displayed (e.g., "Levitation", "Propulsion")
- Temperature, IMU, Gap Height, Hall Effect, and Battery sections all show data

## Ports

| Service  | Port | URL                              |
|----------|------|----------------------------------|
| Frontend | 80   | http://localhost                  |
| Backend  | 5001 | http://localhost:5001/api/health  |

## Troubleshooting

- **Port 5001 in use**: `lsof -i :5001` to find the process, then stop it
- **Port 80 in use**: Set `FRONTEND_PORT=3080` in `GUI/.env` and rebuild
- **Simulator can't connect**: Ensure backend port 5001 is mapped to host (check `docker ps`)
- **UI shows zeros**: Frontend only polls backend when Web Serial is NOT connected (default in Docker)
