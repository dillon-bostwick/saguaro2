/**
 * vendor.js
 */

var mongoose = require('mongoose');

var vendorSchema = new mongoose.Schema({
	name: String,
	active: { type: Boolean, default: true }
})

module.exports = mongoose.model('Vendor', vendorSchema, 'vendors');