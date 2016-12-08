/**
 * bill.js
 */

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var billSchema = new mongoose.Schema({
	_invoice: { type: ObjectId, ref: 'Invoice' },
	requestId: Number,
	xml: String
});

module.exports = mongoose.model('Bill', billSchema, 'bills');