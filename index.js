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
  // this.targetTemp = config['targetTemp'] || this.setTemp;
  this.setPowerState = config['setPowerState'];
  this.thermostatUniqueID = config['thermostatUniqueID'];
  this.tempSensorUniqueID = config['tempSensorUniqueID'];
  this.greater = config['greater'];
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

    let currentTemp = this.xr();
    this.debugLog(currentTemp);

    // if (this.greater) {
    //   if (currentTemp > this.setTemp) {
    //     this.sendCurl('TargetHeatingCoolingState', this.setPowerState);
    //     this.sendCurl('TargetTemperature', this.setTemp);
    //   }
    // } else {
    //   this.sendCurl('TargetHeatingCoolingState', this.setPowerState);
    //   this.sendCurl('TargetTemperature', this.setTemp);
    // }
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

  getCurrentTemp: async function (characteristic, value) {
    new Promise((resolve, reject) => {
      request(
        {
          url: `http://localhost:${this.homebridgeCustomPort}/api/accessories/${this.tempSensorUniqueID}`,
          method: 'GET',
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        },
        (error, response, body) => {
          if (error) {
            this.log.warn(error);
            console.log('error');
            reject(error);
          } else {
            this.log.debug(body);
            console.log('here');
            resolve(response);
          }
        }
      );
    }).then((resolve) => {
      // console.log(resolve);
      console.log('resolve.body' + resolve.body);
      console.log('resolve.body.statusCode' + resolve.body.statusCode);
      console.log('resolve.body.values' + resolve.body.values);
      if (resolve.body.values.CurrentTemperature) {
        console.log(resolve.body.values.CurrentTemperature);
        return resolve.body.values.CurrentTemperature;
      } else {
        this.log.error(
          `Failed to get current temperature. Your uniqueID for your temperature sensor is probably incorrect. Please check your Homebridge logs for more information.`
        );
        console.log(resolve.body);
      }
    });
  },

  sendCurl: async function (characteristic, value) {
    let temp = 0;
    if (this.degreeUnits === 0) {
      temp = this.convertToFahrenheit(value);
    } else {
      temp = value;
    }

    this.log(
      `Sending cURL command to thermostat. Turning Power state to ${characteristic} and temperature to ${temp}`
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
        let responseCode = resolve.body;
        if (responseCode === 401) {
          this.log.error(
            `Failed to send cURL command. Your Bearer Token is either incorrect or has expired. Once you have updated your Bearer Token, please restart Homebridge.`
          );
        } else if (responseCode === 400) {
        }
      } else {
        this.log.error(
          `Failed to send cURL command. Please check your Homebridge logs for more information.`
        );
        console.log(resolve.body);
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
