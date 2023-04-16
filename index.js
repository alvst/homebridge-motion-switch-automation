const request = require('request');

var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory(
    'homebridge-motion-switch',
    'Motion Switch',
    MotionSwitchAccessory
  );
};

function MotionSwitchAccessory(log, config) {
  this.log = log;
  this.motionSensorName = config['motion_sensor_name'];
  this.switchName = config['switch_name'];
  this.bearerToken = config['bearerToken'];
  this.homebridgeCustomPort = config['homebridgeCustomPort'] || 8581;
  this.setTemp = config['setTemp'];
  this.setPowerState = config['setPowerState'];
  this.uniqueID = config['uniqueID'] || false;
  this.degreeUnits = config['degreeUnits'] || 1;

  this.switchState = false;
  this.motionSensorState = false;

  this.motionSensorService = new Service.MotionSensor(this.motionSensorName);
  this.motionSensorService
    .getCharacteristic(Characteristic.MotionDetected)
    .on('get', this.getMotionSensorState.bind(this));

  this.switchService = new Service.Switch(this.switchName);
  this.switchService
    .getCharacteristic(Characteristic.On)
    .on('get', this.getSwitchState.bind(this))
    .on('set', this.setSwitchState.bind(this));
}

MotionSwitchAccessory.prototype = {
  getMotionSensorState: function (callback) {
    callback(null, this.motionSensorState);
  },

  getSwitchState: function (callback) {
    callback(null, this.switchState);
  },

  getSwitchState: function (callback) {
    callback(null, this.switchState);
  },

  getSwitchState: function (callback) {
    callback(null, this.switchState);
  },

  setSwitchState: function (state, callback) {
    this.switchState = state;

    // When we turn this on, we also want to turn on the motion sensor
    this.trigger();
    callback(null);
  },

  trigger: function () {
    if (this.switchState) {
      this.motionSensorState = 1;
      this.motionSensorService.setCharacteristic(
        Characteristic.MotionDetected,
        Boolean(this.motionSensorState)
      );
      setTimeout(this.resetSensors, 1000, this);
    }

    this.sendCurl('TargetHeatingCoolingState', 3);
    this.sendCurl('TargetTemperature', 25);
  },

  resetSensors: function (self) {
    self.switchState = 0;

    self.motionSensorState = 0;
    self.switchService.setCharacteristic(
      Characteristic.On,
      Boolean(self.switchState)
    );
    self.motionSensorService.setCharacteristic(
      Characteristic.MotionDetected,
      Boolean(self.motionSensorState)
    );
  },

  sendCurl: async function (characteristic, value) {
    let temp = 0;
    if (this.degreeUnits === 0) {
      temp = this.convertToFahrenheit(value);
    } else {
      temp = value;
    }

    this.log(
      `Sending cURL command to ${characteristic} with temperature ${temp}`
    );
    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:${this.homebridgeCustomPort}/api/accessories/${this.uniqueID}`,
          method: 'PUT',
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
          json: {
            characteristicType: characteristic,
            value: value,
          },
        },
        (error, response, body) => {
          if (error) {
            this.log.warn(error);
            reject(error);
          } else {
            this.log.debug(body);
            resolve(response);
          }
        }
      );
    }).then((resolve) => {
      if (!resolve.body.uniqueId) {
        let responseCode = resolve.body.statusCode;
        if (responseCode === 401) {
          this.log.error(
            `Failed to send cURL command. Your Bearer Token is either incorrect or has expired. Once you have updated your Bearer Token, please restart Homebridge.`
          );
        } else if (responseCode === 400) {
        }
      }
    });
  },

  convertToFahrenheit: function (value) {
    return (value * 9) / 5 + 32;
  },

  debugLog(message) {
    if (this.debug) {
      this.log.warn(`[DEBUG] ${message}`);
    }
  },

  errorLog(message) {
    this.log.warn(`[ERROR] ${message}`);
  },

  getServices: function () {
    return [this.motionSensorService, this.switchService];
  },
};
