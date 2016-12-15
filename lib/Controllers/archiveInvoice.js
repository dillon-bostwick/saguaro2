/**
 * 
 */

var async = require('async');
var mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');
const Group = mongoose.model('Group');
const Archive = mongoose.model('Archive');
const DropboxHandler = require('../dropboxHandler');
const globals = require('../globals');

var archiveInvoice = (req, res, next) => {
	var invoiceId = req.params.id;
	var user = req.user
	var dropboxConnection = new DropboxHandler(user.currentToken);

	async.parallel([
		(callback) => {
			utils.popFromQueues(user, invoiceId, callback);
		},

		(callback) => {
			Invoice.findById(invoiceId, (error, invoice) => {
				if (error) return callback(err);
				if (!invoice) return callback(404);

				async.parallel([
					(callback) => {
						var oldPath = invoice.fileId;
						var newPath = [globals.archivePath, 'archived'].join('/')

						dropboxConnection.moveFile(oldPath, newPath, callback)
					},

					(callback) => {
						addToArchives(invoice, (err) => {
							if (err) return callback(err);

							invoice.remove(callback);
						});
					}
				],
				(callback)
			}
		}
	],
	(err) => {
		if (err === 404) return res.sendStatus(404);
		if (err) return next(err);

		return res.sendStatus(200);
	})
}

function addToArchives(invoice, callback) {
	
}

module.exports = archiveInvoice;