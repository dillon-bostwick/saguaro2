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
const DropboxHandler = require('../dropboxHandler');
const globals = require('../globals');

/**
 * though cb signatures match, some custom error handling due to
 * possibility of 404 or 403 done in parallel before final cb
 *
 * @param  {Function} callback
 */
var getInvoiceObject = (callback) => {
	Invoice.findById(id, (err, invoice) => {
		if (err) {
			callback(err, null);
		} else if (!invoice) {
			res.sendStatus(404);
		} else if (invoice.toKey && !user.canKey) {
			res.status(403).send('User does not have permission to key new invoices');
		} else {
			callback(null, invoice)
		}
	});
}

/**
 * @param  {Function} callback
 */
var getLinkFromDropbox = (callback) => {
	//TODO: let path get the path to the file or possibly the file id if thats okay
	var path = '/test.pdf';

	// cb signatures match and no parallel error handling necessary
	dropboxConnection.getLink(path, callback);
}

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
	var id = req.params.id;
	var user = req.user
	var dropboxConnection = new DropboxHandler(user.currentToken);

	//id must exist and be valid Mongoose ID
	if (!id || !mongoose.Types.ObjectId.isValid(id)) {
		res.sendStatus(400);
		return;
	}

	async.parallel([
		getInvoiceObject,
		getLinkFromDropbox		
	],
	(err, results) => {
		if (err) next(err);

		res.json({
			file: results[0],
			invoice: results[1]
		});
	});
}

module.exports = getInvoice;





