/**
 * user.js
 *
 * TODO: More validation
 * TODO: Should String be ObjectId referencing?
 */

var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

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

var userSchema = new mongoose.Schema({
	_id: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	personalQueue: [{
		_invoice: { type: ObjectId, ref: 'Invoice' },
		_nextGroup: { type: ObjectId, ref: 'Group'}
	}],
	_groups: [{ type: ObjectId, ref: 'Group' }],
	canKey: { type: Boolean, default: false },
	isAdmin: { type: Boolean, default: false },
	canDeletePerm: { type: Boolean, default: false },
	canArchive: { type: Boolean, default: false },

	// For if in personal queue:
	reqToSubmit: inputFields,
	canChange: inputFields,

	currentToken: String
});

userSchema.plugin(deepPopulate, {});

userSchema.set('versionKey', false);

module.exports = mongoose.model('User', userSchema, 'users');