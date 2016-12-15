/**
 * 
 */

var async = require('async');
var mongoose = require('mongoose');
var _ = require('underscore');

const Invoice = mongoose.model('Invoice');
const Group = mongoose.model('Group');
const User = mongoose.model('User');
const DropboxHandler = require('../dropboxHandler');
const utils = require('../utils');

var deleteInvoice = (req, res, next) => {
	console.log('deleting invoice')

	var invoiceId = req.params.id;
	var user = req.user
	var dropboxConnection = new DropboxHandler(user.currentToken);

	async.parallel([
		(callback) => {
			Invoice.findById(invoiceId, (error, invoice) => {
				if (error) return next(err);
				if (!invoice) return res.sendStatus(404);

				// Delete from Dropbox
				if (invoice.fileId) {
					dropboxConnection.deleteFile(invoice.fileId, (err) => {
			    		if (err) next(err);

			    		console.log('Dropbox file deleted success');
			    	})
				}
		    	
				// delete invoice itself from database
				invoice.remove((err) => {
					if (err) return next(err);

					console.log('invoice deleted success');
				})
			})
		},

		(callback) => {
			utils.popFromQueues(user, invoiceId, callback);
		}
	],
	(err) => {
		if (err) return next(err);

		return res.sendStatus(400);
	})
}

module.exports = deleteInvoice;