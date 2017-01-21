const noble = require('noble');
const Drone = require('rolling-spider');

module.exports = class DroneWatcher {
	constructor() {
		noble.on('discover', this.onDiscover.bind(this));
		noble.on('stateChange', this.onStart.bind(this));
	}

	/**
	 * @param {string} state
	 */
	onStart(state) {
		if (state !== 'poweredOn') { return; }
		noble.startScanning();
	}

	/**
	 * @param {{uuid: string, state: string, advertisement: {localName: string}}} peripheral
	 */
	onDiscover(peripheral) {
		const {uuid, advertisement: {localName: name}} = peripheral;
		if (!Drone.isDronePeripheral(peripheral)) { return; }
		console.log(uuid, name);
	}

	/**
	 * @returns {{uuid: string, name: string}}
	 */
	connectedDrones() {
		return [
			{ uuid: 'uuid-00', name: 'name-00' },
			{ uuid: 'uuid-01', name: 'name-01' }
		];
	}
};