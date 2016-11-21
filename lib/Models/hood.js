/**
 * hood.js
 */

var mongoose = require('mongoose');

var hoodSchema = new mongoose.Schema({
	name: String,
	shortHand: String,
	subHoodOptions: [String]
});

module.exports = mongoose.model('Hood', hoodSchema, 'hoods');