/**
 * Golf Shot Detector — Seeed XIAO nRF52840 Sense
 * =============================================================================
 * Detects golf swings and putt strokes using the onboard LSM6DS3TR-C 6-axis
 * IMU and broadcasts each shot over BLE so the Golf Scorecard app can
 * automatically count shots and putts in real time.
 *
 * BLE Service UUID  : 19B10000-E8F2-537E-4F6C-D104768A1214
 * Shot Char UUID    : 19B10001-E8F2-537E-4F6C-D104768A1214
 * Notification fmt  : "PlayerName:TYPE:magnitude"
 *   e.g. "John:SWING:5.2"   or   "John:STROKE:1.1"
 *
 *   TYPE = SWING  — full shot / chip  (peak net accel > SWING_THRESHOLD)
 *   TYPE = STROKE — putt / soft chip  (peak net accel > STROKE_THRESHOLD)
 *
 * The app automatically distinguishes putts from chips by checking whether
 * the player is within ~25 m of the pin when a STROKE is received.
 *
 * =============================================================================
 * BOARD SETUP (do this once in Arduino IDE)
 * =============================================================================
 * 1. File → Preferences → Additional Boards URLs, add:
 *    https://files.seeedstudio.com/arduino/package_seeeduino_boards_index.json
 * 2. Tools → Board Manager → search "Seeed nRF52 mbed-enabled Boards" → Install
 * 3. Select board: Tools → Board → Seeed nRF52 mbed-enabled → XIAO nRF52840 Sense
 *
 * LIBRARIES (install via Library Manager — Sketch → Include Library → Manage)
 *   - ArduinoBLE            (v1.3 or later)
 *   - Seeed_Arduino_LSM6DS3 (search "LSM6DS3 Seeed")
 *
 * =============================================================================
 * WIRING
 * =============================================================================
 * No external wiring needed — LSM6DS3 is soldered on the XIAO nRF52840 Sense.
 * Attach the board to the player using one of:
 *   - Wristband / glove attachment (recommended — closest to swing motion)
 *   - Belt clip or chest mount
 *   - Grip sleeve on the club handle
 *
 * =============================================================================
 * CONFIGURATION — edit the section below before flashing
 * =============================================================================
 */

#include <ArduinoBLE.h>
#include "LSM6DS3.h"
#include "Wire.h"

// ── ⚙️  USER CONFIGURATION ── change these before flashing each board ─────────

// Player name — must match (case-insensitive) the player name used in the app
const char* PLAYER_NAME = "Player1";

// Detection thresholds (net g-force, i.e. gravity subtracted)
const float SWING_THRESHOLD  = 3.5f;   // g — full drive / iron shot
const float STROKE_THRESHOLD = 0.7f;   // g — putt or very soft chip

// Timing
const unsigned long WINDOW_MS   = 350UL;  // ms — peak-search window after arm
const unsigned long COOLDOWN_MS = 1800UL; // ms — dead time after each shot

// ── ─────────────────────────────────────────────────────────────────────────

#define SERVICE_UUID   "19B10000-E8F2-537E-4F6C-D104768A1214"
#define SHOT_CHAR_UUID "19B10001-E8F2-537E-4F6C-D104768A1214"

// ── Hardware ──────────────────────────────────────────────────────────────────
LSM6DS3 imu(I2C_MODE, 0x6A);   // LSM6DS3TR-C on XIAO nRF52840 Sense

// ── BLE ───────────────────────────────────────────────────────────────────────
BLEService     shotService(SERVICE_UUID);
BLECharacteristic shotChar(SHOT_CHAR_UUID, BLERead | BLENotify, 48);

// ── State machine ─────────────────────────────────────────────────────────────
enum class State : uint8_t { IDLE, DETECTING, COOLDOWN };

State         sensorState  = State::IDLE;
float         peakMag      = 0.0f;
unsigned long windowStart  = 0;
unsigned long cooldownStart = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the net 3-axis acceleration magnitude with static gravity removed.
 * At rest the sensor reads ~1.0 g total; we subtract that offset so the
 * returned value is ~0 when still and positive during an impact.
 */
float netMagnitude() {
  float ax = imu.readFloatAccelX();
  float ay = imu.readFloatAccelY();
  float az = imu.readFloatAccelZ();
  float total = sqrtf(ax * ax + ay * ay + az * az);
  return fabsf(total - 1.0f);
}

void emitShot(const char* type, float magnitude) {
  char payload[48];
  snprintf(payload, sizeof(payload), "%s:%s:%.1f", PLAYER_NAME, type, magnitude);

  // Write to BLE characteristic — connected centrals receive a notification
  shotChar.writeValue((const uint8_t*)payload, strlen(payload));

  // Visual feedback: LED blinks once (active-LOW on XIAO)
  digitalWrite(LED_BUILTIN, LOW);
  delay(80);
  digitalWrite(LED_BUILTIN, HIGH);

  Serial.print("[SHOT] ");
  Serial.println(payload);
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);  // off

  Wire.begin();

  // Configure IMU: ±8 g range, 104 Hz output rate
  imu.settings.accelRange      = 8;
  imu.settings.accelSampleRate = 104;

  if (imu.begin() != 0) {
    Serial.println("ERROR: IMU init failed — check I2C wiring");
    while (true) { delay(1000); }
  }

  if (!BLE.begin()) {
    Serial.println("ERROR: BLE init failed");
    while (true) { delay(1000); }
  }

  // Build device name that the app filters on: "Golf-<PlayerName>"
  char deviceName[48];
  snprintf(deviceName, sizeof(deviceName), "Golf-%s", PLAYER_NAME);

  BLE.setLocalName(deviceName);
  BLE.setAdvertisedService(shotService);
  shotService.addCharacteristic(shotChar);
  BLE.addService(shotService);
  BLE.advertise();

  Serial.print("BLE advertising as: ");
  Serial.println(deviceName);
  Serial.println("Ready — waiting for swing...");

  // Three quick blinks to indicate ready
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_BUILTIN, LOW);
    delay(120);
    digitalWrite(LED_BUILTIN, HIGH);
    delay(120);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
void loop() {
  BLE.poll();   // keep BLE stack alive and accept connections

  float         mag = netMagnitude();
  unsigned long now = millis();

  switch (sensorState) {

    case State::IDLE:
      // Wait for any motion above the soft stroke threshold to arm detection
      if (mag > STROKE_THRESHOLD) {
        sensorState = State::DETECTING;
        peakMag     = mag;
        windowStart = now;
      }
      break;

    case State::DETECTING:
      // Track the peak magnitude during the detection window
      if (mag > peakMag) peakMag = mag;

      // End the window when:
      //   a) the configured time has elapsed, OR
      //   b) acceleration dropped well below threshold (swing is over)
      if ((now - windowStart) >= WINDOW_MS || mag < STROKE_THRESHOLD * 0.4f) {
        if      (peakMag >= SWING_THRESHOLD)  emitShot("SWING",  peakMag);
        else if (peakMag >= STROKE_THRESHOLD) emitShot("STROKE", peakMag);
        // else: noise / accidental motion — ignore

        sensorState   = State::COOLDOWN;
        cooldownStart = now;
        peakMag       = 0.0f;
      }
      break;

    case State::COOLDOWN:
      // Mandatory dead time to prevent double-counting a single swing
      if ((now - cooldownStart) >= COOLDOWN_MS) {
        sensorState = State::IDLE;
      }
      break;
  }

  delay(8);   // ~125 Hz poll rate — fine-grained enough for sharp impact peaks
}
