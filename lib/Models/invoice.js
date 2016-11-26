/**
 * invoice.js
 */

var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

const LineItemCategories = ['CIP', 'EXPENSE', 'WARRANTY'];
const MONEY = { type: Number, min: 0, max: 150000, default: 0 };
const NOW = { type: Date, default: Date.now };


var invoiceSchema = new mongoose.Schema({
	serviceDate: Date,
	_vendor: { type: ObjectId, ref: 'Vendor', },
	invNum: String,
	amount: MONEY,
	lineItems: [{
		category: {type: String, enum: LineItemCategories},
		_hood: { type: ObjectId, ref: 'Hood' }, // if EXPENSE: must be empty
		subHood: String, // if CIP or WARRANTY: can vary: null (i.e. unknown), hood, dev, or just a number. If EXPENSE: must be []]
		_activities: [{ type: ObjectId, ref: 'Activity' }], // if CIP starts as [] and gets filled. If EXPENSE or WARRANTY: must be []]
		_expense: { type: ObjectId, ref: 'Expense' }, // if CIP or WARRANTY: must be ''.
		amount: MONEY, //required
		desc: { type: String, default: '' }
	}],
	actions: [{
		desc: { type: String, default: '' },
		comment: { type: String, default: '' },
		date: NOW,
		_user: { type: ObjectId, ref: 'User' }
	}],
	dropboxId: String // or null
	// qbXmlGuid: { type: String, default: '' },  // if not empty, means it has been set to bill i.e. archived
	// qbResponse: { type: Object, default: null }
});

invoiceSchema.set('versionKey', false);

module.exports = mongoose.model('Invoice', invoiceSchema, 'invoices');
module.exports = mongoose.model('Archive', invoiceSchema, 'archives');