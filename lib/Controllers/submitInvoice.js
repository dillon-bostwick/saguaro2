/**
 *
 * sent:
 *
 * {
 * 		invoice: Object
 * 		isHold: Boolean
 * }
 *
 * Possible client errors: 400, 403, 404, 422
 */

var mongoose = require('mongoose');
var _ = require('underscore');

const utils = require('../utils');

const Invoice = mongoose.model('Invoice');
const Bill = mongoose.model('Bill');
const Archive = mongoose.model('Archive');
const User = mongoose.model('User');

var submitInvoice = function(req, res, next) {
	var newInvoice = req.body.invoice;
	var valErr;

	if (!newInvoice) { // malformed request (pre deeper validation)
		res.sendStatus(400);
		return;
	}

	(new Invoice(newInvoice)).validate((err) => { // custom logical validation - must use mongoose constructor to get validate on the prototype but this isn't so the new instace can get saved...
		if (err) {
			res.status(422).send(err);
			return;
		}

		locateInvoice(req.user, newInvoice._id, (err, isPersonal, currentGroup) => { // currentGroup===null means toBill, isObjectId(currentGroup) means belongs to user's personal and that id is the nextGroup id, else currentGroup is the belonging group itself
			if (err === 'not found') {
				res.status(403).send(err); // invoice doesn't belong to user
				return;
			}

			if (err) return next(err)

			Invoice.findById(newInvoice._id, (err, oldInvoice) => { // retrieve the old
				if (err) return next(err);

				if (!oldInvoice) { // invoice not found
					res.sendStatus(404);
					return;
				}

				if (isPersonal) { // ie from personal
					// currentGroup is the id of the nextGroup, and validation is personal
					valErr = validateAgainstCustoms(oldInvoice, newInvoice, user.reqToSubmit, user.canChange)
				} else {
					// currentGroup is the current group object and validation is group based
					valErr = validateAgainstCustoms(oldInvoice, newInvoice, currentGroup.reqToSubmit, currentGroup.canChange)
				}

				if (valErr) {
					res.status(403).send(valErr);
					return;
				}

				moveInvoice(req.body, newInvoice, isPersonal, currentGroup, (err) => {
					if (err) {
						// multiple possible error codes - see moveInvoice definition
						res.status(err.statusCode)
					} else {
						res.sendStatus(200);
					}
				});
			});
		})
	});
}

/**
 * [checkUserQueue description]
 * @param  {Function} callback(err, nextGroupId)
 */
function locateInvoice(user, targetInvoiceId, callback) {
	// try personal queues (synchronous)
	for (var i = 0; i < user.personalQueue.length; i++) {
		if (user.personalQueue[i]._invoice.equals(targetInvoiceId)) {
			return callback(null, true, user.personalQueue[i]._nextGroup);
		}
	}

	// try group queues
	User.findById(user._id, (err, userDoc) => {
		if (err) return callback(err, null);

		userDoc.populate('_groups', (err, populUser) => {
			if (err) return callback(err, false, null);

			for (var i = 0; i < populUser._groups.length; i++) {
				var group = populUser._groups[i];

				for (var j = 0; j < group._queue.length; j++) {
					if (group._queue[j].equals(targetInvoiceId)) {
						return callback(null, group);
					}
				}
			}

			return callback('not found', false, null); // not found
		});
	});
}

/**
 * [moveInvoice description]
 * @param  {[type]}   existingInvoice [description]
 * @param  {[type]}   currentGroup    [description]
 * @param  {Function} callback        [description]
 * @return {[type]}                   [description]
 *
 * Callback signature only has err argument
 */
function moveInvoice(reqBody, newInvoice, isPersonal, currentGroup, callback) {
	if (reqBody.isHold) {
		callback(null);
	}

	if (reqBody.override) {
		if (!reqBody.user.canOverride) return callback({ statusCode: 403 });

		if (isPersonal) {
			// pop from user._personalQueue
			// push to override user: {
			// 		invoice: invoice
			// 		nextGroup: currentGroup
			// }
		} else {
			// pop from CurrentGroup._queue
			// push to override user: {
			// 		invoice: invoice
			// 		nextGroup: currentGroup._nextGroup
			// }
		}
	}

	if (!currentGroup) { // currentGroup===null means to bill.
		makeBill(newInvoice);
		currentToArchive(newInvoice);
	}

	if (isPersonal) {
		// pop from user._personalQueue
		// push to currentGroup group
	} else {
		// pop from CurrentGroup._queue
		// push to currentGroup._nextGroup group
	}

	callback(null);
}

function currentToArchive(invoice) {
	console.log('currentToArchive');
	return 'stub';
}

function makeBill(invoice, callback) {
	console.log('makeBill');
	return 'stub';
}


/**
 * [validateAgainstCustoms description]
 * @param  {[type]} invoice [description]
 * @param  {[type]} user    [description]
 * @param  {[type]} group   [description]
 * @return {[type]}         [description]
 */
function validateAgainstCustoms(oldInvoice, newInvoice, reqToSubmit, canChange) {
	var errors = [];
	var oldLineItem;
	var newLineItem;

	console.log(newInvoice);

	// check changes
	if (!canChange.serviceDate && oldInvoice.serviceDate !== newInvoice.serviceDate)
		errors.push('Cannot change service date');
	if (!canChange.vendor && oldInvoice._vendor !== newInvoice.vendor)
		errors.push('Cannot change vendor');
	if (!canChange.invNum && oldInvoice.invNum !== newInvoice.invNum)
		errors.push('Cannot change invoice number');
	if (!canChange.lineItem && oldInvoice.lineItems.length !== newInvoice.lineItems.length)
		errors.push('Cannot change number of line items');

	// check min requirements
	if (reqToSubmit.serviceDate && !newInvoice.serviceDate)
		errors.push('Must specify service date');
	if (reqToSubmit.vendor && !newInvoice._vendor)
		errors.push('Must specify vendor');
	if (reqToSubmit.invNum && !newInvoice.invNum)
		errors.push('Must specify invoice number');
	if (reqToSubmit.lineItem && _.isEmpty(newInvoice.lineItem))
		errors.push('Cannot leave line items empty')

	// for each line item
	for (var i = 0; i < oldInvoice.lineItems.length && i < newInvoice.lineItems.length; i++) {
		oldLineItem = oldInvoice.lineItems[i];
		newLineItem = newInvoice.lineItems[i];

		// check changes
		if (!canChange.hoods && oldLineItem._hood !== newLineItem._hood)
			errors.push('Cannot change a hood');
		if (!canChange.lots && oldLineItem.subHood !== newLineItem.subHood)
			errors.push('Cannot change a lot');
		if (!canChange.activities && oldLineItem._activities !== newLineItem._activities)
			errors.push('Cannot change any activities');
		if (!canChange.expenses && oldLineItem._expense !== newLineItem._expense)
			errors.push('cannot change an expense name');

		// check min requirements
		if (reqToSubmit.hoods && newLineItem.category !== 'EXPENSE' && !newLineItem._hood)
			errors.push('Hood required for every CIP or warrant');
		if (reqToSubmit.lots && newLineItem.category !== 'EXPENSE' && !newLineItem.subHood)
			errors.push('Lot required for every CIP or warrant');
		if (reqToSubmit.activities && newLineItem.category === 'CIP' && _.isEmpty(newLineItem._activities)) {}
			errors.push('An activity is required for every CIP');
		if (reqToSubmit.expense && newLineItem.category === 'EXPENSE' && !newLineItem._expense)
			errors.push('An expense name is required for every expense');
	}

	return _.isEmpty(errors) ? null : errors;
}







module.exports = submitInvoice;

