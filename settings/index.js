const fs = require('fs');
const dot = require('dot-prop');
const libpath = require('path');

const path = libpath.join(__dirname, 'settings.json');
const json = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : {};

/**
 * @param {string} k
 * @returns {string}
 */
const get = (k) => dot.get(json, k);

module.exports = {get};