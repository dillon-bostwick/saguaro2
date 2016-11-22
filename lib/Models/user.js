/**
 * user.js
 *
 * TODO: More validation
 * TODO: Should String be ObjectId referencing?
 */

var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);

const inputFieldsSchema = require('../globals').inputFieldsSchema;

const ObjectId = mongoose.Schema.Types.ObjectId;

var userSchema = new mongoose.Schema({
	_id: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	personalQueue: [{
		_invoice: { type: ObjectId, ref: 'Invoice' },
		_nextGroup: { type: ObjectId, ref: 'Group'} // or null means to bill
	}],
	_groups: [{ type: ObjectId, ref: 'Group' }],
	canKey: { type: Boolean, default: false },
	isAdmin: { type: Boolean, default: false },
	canDeletePerm: { type: Boolean, default: false },
	canArchive: { type: Boolean, default: false },

	// For if in personal queue:
	reqToSubmit: inputFieldsSchema,
	canChange: inputFieldsSchema,

	currentToken: String
});

userSchema.plugin(deepPopulate, {});

userSchema.set('versionKey', false);

module.exports = mongoose.model('User', userSchema, 'users');