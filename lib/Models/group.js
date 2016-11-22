/**
 * group.js
 *
 * TODO: More validation
 * TODO: Should String be ObjectId referencing?
 */

var mongoose = require('mongoose');

const inputFieldsSchema = require('../globals').inputFieldsSchema;

const ObjectId = mongoose.Schema.Types.ObjectId;

var groupSchema = new mongoose.Schema({
	name: { type: String, required: true },
	_queue: [{ type: ObjectId, ref: 'Invoice' }],
	_nextGroup: { type: ObjectId, ref: 'Group' }, // null means to bill
	_users: [{ type: ObjectId, ref: 'User' }],

	reqToSubmit: inputFieldsSchema,
	canChange: inputFieldsSchema,

	toKey: { type: Boolean, default: false }
});

module.exports = mongoose.model('Group', groupSchema, 'groups');