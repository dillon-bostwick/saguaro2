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
const utils = require('../utils');

var archiveInvoice = (req, res, next) => {
	console.log('archiving invoice');

	var invoiceId = req.params.id;
	var user = req.user
	var dropboxConnection = new DropboxHandler(user.currentToken);

	async.parallel([
		(callback) => {
			utils.popFromQueues(user, invoiceId, callback); // remove from queues
		},

		(callback) => {
			Invoice.findById(invoiceId, (error, invoice) => {
				if (error) return callback(err);
				if (!invoice) return callback(404);

				async.parallel([
					(callback) => {
						var oldPath = invoice.fileId; // TODO: test; if it works, then get rid of filePath from Invoice
						var newPath = [globals.archivePath, invoiceId.toString()].join('/')

						dropboxConnection.moveFile(oldPath, newPath, callback) // move file to /archive
					},

					(callback) => { // move to archive db
						(new Archive(invoice)).save().then(() => {
							invoice.remove(callback);
						});
					}
				], callback)
			});
		}
	],
	(err) => {
		if (err === 404) return res.sendStatus(404);
		if (err) return next(err);

		return res.sendStatus(200);
	})
}

module.exports = archiveInvoice;