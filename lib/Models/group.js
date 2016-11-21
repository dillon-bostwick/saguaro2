/**
 * group.js
 *
 * TODO: More validation
 * TODO: Should String be ObjectId referencing?
 */

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var inputFields = {
		serviceDate: { type: Boolean, default: false },
		vendor: { type: Boolean, default: false },
		invNum: { type: Boolean, default: false },
		lineItem: { type: Boolean, default: false },
		hoods: { type: Boolean, default: false },
		lots: { type: Boolean, default: false },
		activities: { type: Boolean, default: false },
		expenses: { type: Boolean, default: false },
	}

var groupSchema = new mongoose.Schema({
	name: { type: String, required: true },
	_queue: [{ type: ObjectId, ref: 'Invoice' }],
	isHead: { type: Boolean, default: false },
	_nextGroup: { type: ObjectId, ref: 'Group' }, // or null for to bill
	reqToSubmit: inputFields,
	canChange: inputFields
});

module.exports = mongoose.model('Group', groupSchema, 'groups');


