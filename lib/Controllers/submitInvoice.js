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

const Invoice = mongoose.model('Invoice');
const User = mongoose.model('User');
const utils = require('../utils');

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

		locateInvoice(req.user, newInvoice._id, (err, currentGroup) => { // currentGroup===null means doesn't belong to user, currentGroup==='own' means belongs to user's personal, else currentGroup is the belonging group
			if (err) return next(err)

			if (!currentGroup) {
				res.status(403).send(err); // invoice doesn't belong to user
				return;
			}

			Invoice.findById(newInvoice._id, (err, oldInvoice) => { // getting old
				if (err) return next(err);

				if (!oldInvoice) { // invoice not found
					res.sendStatus(404);
					return;
				}

				valErr = validateAgainstCustoms(oldInvoice, newInvoice, req.user, currentGroup); // custom user-requirements validation

				if (valErr) {
					res.status(403).send(valErr);
					return;
				}

				moveInvoice(newInvoice, currentGroup, (err) => {
					if (err) {
						// multiple possible error codes - see moveInvoice definition
						res.status(err.statusCode).send(err.message); 
					} else {
						res.sendStatus(200);
					}
				});
			});
		})
	});
}


/**
 * [validateAgainstCustoms description]
 * @param  {[type]} invoice [description]
 * @param  {[type]} user    [description]
 * @param  {[type]} group   [description]
 * @return {[type]}         [description]
 */
function validateAgainstCustoms(oldInvoice, newInvoice, user, group) {

	return null; // string if error, null if pass
}

/**
 * [checkUserQueue description]
 * @param  {Function} callback(err, nextGroupId)
 */
function locateInvoice(user, targetInvoiceId, callback) {

	// try personal queue (this is synchronous)
	_.each(user._personalQueue, (invoiceId) => {
		if (invoiceId.equals(targetInvoiceId)) {
			return callback(null, 'own'); // own
		}
	});

	// try group queues
	User.findById(user._id, (err, userDoc) => {
		if (err) return callback(err, null);

		userDoc.populate('_groups', (err, populUser) => {
			if (err) return callback(err, null);

			for (var i = 0; i < populUser._groups.length; i++) {
				var group = populUser._groups[i];

				for (var j = 0; j < group._queue.length; j++) {
					if (group._queue[j].equals(targetInvoiceId)) {
						return callback(null, group);
					}
				}
			}

			return callback(null, null); // not found
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
function moveInvoice(newInvoice, currentGroup, callback) {
	// is ready to bill?
	// 		parse to qbxml and then add to bill in db
	// 		Move to archives in dropbox
	// 	else
	// 		pop from the current group / isnew = false / pop from current queue, then
	// 		push to the right next place (possibility of 404ing)

	var err = {
		statusCode: 420, // TODO: note that you have to set statusCode yourself right here
		message: 'foo'
	}

	callback(null, null);
}







module.exports = submitInvoice;

