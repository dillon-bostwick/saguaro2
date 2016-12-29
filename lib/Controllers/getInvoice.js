/**
 * req should have id that is valid Mongoose ID
 *
 * res will be of form:
 * {
 * 		file: Object from Dropbox API (includes metadata and link)
 * 		invoice: Object from database
 * }
 *
 * Possible client errors: 400, 404, 403
 * Any server errors are likely arising from Dropbox or Mongoose responses
 */

var async = require('async');
var mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');
const Group = mongoose.model('Group');
const DropboxHandler = require('../dropboxHandler');
const utils = require('../utils');
const globals = require('../globals');

/**
 * Run two tasks in parallel:
 * - get invoice object from database
 * - get link to file from dropbox
 *
 * if finished without error respond with an object of form:
 * {
 * 		file: Object from Dropbox API (includes metadata and link)
 * 		invoice: Object from database
 * }
*/
var getInvoice = (req, res, next) => {
	var invoiceId = req.params.id;
	var user = req.user
	var dropboxConnection = new DropboxHandler(user.currentToken);
	var resObj = {};

	//id must exist and be valid Mongoose ID
	if (!invoiceId || !mongoose.Types.ObjectId.isValid(invoiceId)) {
		res.sendStatus(400);
		return;
	}

	Invoice.findById(invoiceId, (err, invoice) => {
		if (err) {
			return next(err);
		} else if (!invoice) {
			return res.sendStatus(404);
		} else if (invoice.toKey && !user.canKey) {
			return res.status(403).send('User does not have permission to key new invoices');
		}

		delete invoice.amount;
		resObj.invoice = invoice;

		if (invoice.fileId) {
			dropboxConnection.getLink(invoice.fileId, (err, dbRes) => {
				if (err) console.log(err); // the request shouldn't completely fail if the link wasn't found

				if (!err && dbRes) {
					resObj.file = {
						link: dbRes.link,
						name: dbRes.metadata.name
					}
				}

				findLocation(user, invoice, resObj, (err, resObj) => {
					if (err) return next(err);
					res.json(resObj);
					return;
				})
			})
		} else {
			//fileId does not exist - do not find link
			findLocation(user, invoice, resObj, (err, resObj) => {
				if (err) return next(err);

				res.json(resObj);
				return;
			})
		}
	})
}

function findLocation(user, invoice, resObj, callback) {
	utils.locateInvoice(user, invoice._id, (err, isPersonal, currentGroup) => {
		if (err === 'not found') {
			resObj.location = { belongsToUser: false };

			callback(null, resObj);
		} else if (err) {
			next(err, null);
		} else {
			resObj.location = {
				belongsToUser: true,
				isPersonal: isPersonal,
				currentGroupName: isPersonal ? null : currentGroup.name
			}

			callback(null, resObj);
		}
	})
}





module.exports = getInvoice;
