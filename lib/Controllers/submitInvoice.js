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
const Group = mongoose.model('Group');

var submitInvoice = function(req, res, next) {
	var newInvoice = new Invoice(req.body.invoice);
	var valErr;

	newInvoice._id = req.body.invoice._id

	if (!newInvoice) { // malformed request (pre deeper validation)
		res.sendStatus(400);
		return;
	}

	utils.locateInvoice(req.user, newInvoice._id, (err, isPersonal, currentGroup) => { // currentGroup===null means toBill, isObjectId(currentGroup) means belongs to user's personal and that id is the nextGroup id, else currentGroup is the belonging group itself
		if (err === 'not found') {
			res.status(403).send('Invoice does not belong to user'); // invoice doesn't belong to user
			return;
		}

		if (err) return next(err)

		Invoice.findOne({ _id: newInvoice._id }, (err, oldInvoice) => { // retrieve the old
			if (err) return next(err);

			if (!oldInvoice) { // invoice not found
				res.sendStatus(404);
				return;
			}

			if (isPersonal) { // ie from personal
				// currentGroup is the id of the nextGroup, and validation is personal
				personalValErr = validateAgainstCustoms(oldInvoice, newInvoice, req.user.reqToSubmit, req.user.canChange)
			} else {
				// currentGroup is the current group object and validation is group based
				personalValErr = validateAgainstCustoms(oldInvoice, newInvoice, currentGroup.reqToSubmit, currentGroup.canChange)
			}

			if (personalValErr) {
				res.status(422).send(personalValErr);
				return;
			}

			// do actual updates:
			updateInvoice(oldInvoice, req.body.invoice, (err) => {
				console.log(err);
				if (err) return res.status(422).send(err); // validation error

				// then move to new location
				moveInvoice(req, newInvoice, isPersonal, currentGroup, (err) => {
					if (err) {
						return res.sendStatus(500);
					} else {
						return res.sendStatus(200);
					}
				});
			});
		});
	});
}

/**
 * [updateInvoice description]
 * @param  {[type]}   oldInvoice [description]
 * @param  {[type]}   newInvoice [description]
 * @param  {Function} callback   [description]
 * @return {[type]}              [description]
 */
function updateInvoice(oldInvoice, newInvoice, callback) {
	_.each(newInvoice, (val, key) => {
		if (key !== '_id') {
			oldInvoice[key] = val;
		}
	});

	oldInvoice.save((err, invoice) => {
		return callback(err);
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
function moveInvoice(req, newInvoice, isPersonal, currentGroup, callback) {
	if (req.body.isHold) {
		if (req.user.canHold) return callback({ statusCode: 403 });

		return callback(null); // do nothing - stays in queue (right now history is updated in frontend)
	}

	if (req.body.override) {
		if (!req.user.canOverride) return callback({ statusCode: 403 }); // some users cant override

		if (isPersonal) {
			// currentGroup is id
			// 
			popFromUserPersonal(req.user, newInvoice._id, () => {
				// push to override target user, borrowing the existing nextGroup:
				pushToUserPersonal(req.body.override, {
					_invoice: newInvoice._id,
					_nextGroup: currentGroup
				},
				(err) => {
					return callback(err);
				});
			});
		} else {
			// currentGroup is object
			// 
			popFromGroup(currentGroup, newInvoice._id, () => {
				pushToUserPersonal(req.body.override, {
					_invoice: newInvoice._id,
					_nextGroup: currentGroup._nextGroup
				},
				(err) => {
					return callback(err);
				});
			})
		}
	} else if (_.isNull(currentGroup) || _.isNull(currentGroup._nextGroup)) { // i.e. to bill
		makeBill(newInvoice, (err) => {
			if (err) return callback(err);

			currentToArchive(newInvoice, (err) => {
				if (err) return callback(err);

				if (isPersonal) {
					popFromUserPersonal(req.user, newInvoice._id, callback)
				} else {
					popFromGroup(currentGroup, newInvoice._id, callback);
				}
			});
		});
	} else { // not overriden - goes to next group like normal
		if (isPersonal) {
			popFromUserPersonal(req.user, newInvoice._id, () => {
				pushToGroup(currentGroup, newInvoice._id, callback);
			});
		} else {
			popFromGroup(currentGroup, newInvoice._id, () => {
				pushToGroup(currentGroup._nextGroup, newInvoice._id, callback);
			});
		}
	}
}

/**
 */
function popFromGroup(group, invoiceId, callback) {
	group._queue = _.filter(group._queue, (id) => {
		return !id.equals(invoiceId)
	});

	group.save((err, user) => {
		callback(err);
	})
}

/**
 * callback takes no args. User is user object itself
 */
function popFromUserPersonal(user, invoiceId, callback) {
	user.personalQueue = _.filter(user.personalQueue, (ele) => {
		return !ele._invoice.equals(invoiceId)
	})

	user.save((err, user) => {
		callback(err);
	})
}

function pushToGroup(groupId, invoiceId, callback) {
	Group.findById(groupId, (err, group) => {
		if (err) callback(err);

		group._queue.push(invoiceId);

		group.save((err, user) => {
			callback(err);
		});
	});
}

/**
 * callback takes err arg. UserId is only id, not user itself.
 * ele is of form { _invoice: 'foo', _nextGroup: 'bar' }
 */
function pushToUserPersonal(userId, ele, callback) {
	User.findById(userId, (err, user) => {
		if (err) callback(err);

		user.personalQueue.push(ele);

		user.save((err, user) => {
			return callback(err);
		});
	});
}

function currentToArchive(invoice, callback) {
	var archive = new Archive(invoice);

	archive.save((err, archive) => {
		if (err) return callback(err);

		invoice.remove((err) => {
			callback(err);
		});
		return callback(err);
	});
}

/**
 * callback of form (err)
 */
function makeBill(invoice, callback) {
	var billId = mongoose.Types.ObjectId();

	Invoice.findById(invoice._id, (err, invoice) => {
		if (err) return callback(err);

		invoice.populate('_vendor lineItems._activities lineItems._hood lineItems._expense', (err, populInvoice) => {
			let bill = new Bill({
				_id: billId,
				_invoice: invoice._id,
				xml: utils.billToQbXml(populInvoice, billId.toString())
			});

			bill.save((err, bill) => {
				return callback(err);
			});
		});
	});
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

	// check changes
	if (!canChange.serviceDate && oldInvoice.serviceDate !== newInvoice.serviceDate)
		errors.push('Cannot change service date');
	if (!canChange.vendor && oldInvoice._vendor.equals(newInvoice.vendor))
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
		if (!canChange.hoods && isChange('_hood', oldInvoice, newInvoice))
			errors.push('Cannot change a hood');
		if (!canChange.lots && oldLineItem.subHood !== newLineItem.subHood)
			errors.push('Cannot change a lot');
		if (!canChange.activities && !sameArrayOfIds(oldLineItem._activities, newLineItem._activities))
			errors.push('Cannot change any activities');
		if (!canChange.expenses && isChange('_expense', oldInvoice, newInvoice))
			errors.push('Cannot change an expense name');

		// check min requirements
		if (reqToSubmit.hoods && newLineItem.category !== 'EXPENSE' && !newLineItem._hood)
			errors.push('Hood required for every CIP or warrant');
		if (reqToSubmit.lots && newLineItem.category !== 'EXPENSE' && !newLineItem.subHood)
			errors.push('Lot required for every CIP or warrant');
		if (reqToSubmit.activities && newLineItem.category === 'CIP' && _.isEmpty(newLineItem._activities))
			errors.push('An activity is required for every CIP');
		if (reqToSubmit.expense && newLineItem.category === 'EXPENSE' && !newLineItem._expense)
			errors.push('An expense name is required for every expense');
	}

	return _.isEmpty(errors) ? null : _.uniq(errors);
}

function isChange(element, oldInv, newInv) {
	if (!oldInv[element] && !newInv[element]) {
		return false;
	} else if (oldInv[element] && !newInv[element] || !oldInv[element] && newInv[element]) {
		return true;
	} else {
		return !oldInv[element].equals(newInv[element]);
	}
}

function sameArrayOfIds(a, b) {
	if (_.isEmpty(a) && _.isEmpty(b)) return true;
	if (a.length !== b.length) return false;

	for (var i = 0; i < a.length; i++) {
		if (!a[i].equals(b[i])) {
			return false;
		}
	}

	return true;
}




module.exports = submitInvoice;

