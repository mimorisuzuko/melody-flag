const noble = require('noble');
const Drone = require('rolling-spider');
const _ = require('lodash');

module.exports = class DroneWatcher {
	constructor() {
		noble.on('discover', this.onDiscover.bind(this));
		noble.on('stateChange', this.onStart.bind(this));

		/** @type {string[]} */
		this.knownUUIDs = [];
		this._connectedDrones = [];
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
		const {knownUUIDs} = this;
		const {uuid, advertisement: {localName: name}, state} = peripheral;
		if (!Drone.isDronePeripheral(peripheral) || _.includes(knownUUIDs, uuid)) { return; }
		this.knownUUIDs.push(uuid);

		const drone = new Drone({ uuid });
		drone.connect(() => {
			drone.setup(() => {
				drone.flatTrim();
				drone.startPing();
				drone.flatTrim();
				this._connectedDrones.push(drone);
			});
		});
	}

	/**
	 * @param {number} debugNumber
	 * @returns {{uuid: string, name: string}}
	 */
	connectedDrones(debugNumber) {
		const {_connectedDrones: drones} = this;

		return debugNumber ? _.map(Array(debugNumber), (a, i) => ({ name: `debug-${i}`, uuid: `uuid-${i}` }))
			: _.map(drones, ({name, uuid}) => ({ name, uuid }));
	}

	/**
	 * @param {string} uuid
	 */
	drone(uuid) {
		const {_connectedDrones: drones} = this;

		return _.find(drones, { uuid });
	}
};