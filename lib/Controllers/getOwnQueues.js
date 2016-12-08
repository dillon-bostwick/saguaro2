// /**
//  * Only need user from req - no custom params
//  *
//  * res.queues is a map of arrays of invoices
//  *
//  * NOTE: Dropbox has a 'dropzone' directory for every file that hasn't been
//  * keyed yet. All users where canKey==true have a 'to key from dropzone' queue
//  * that corresponds with the files in that directory. The way this is
//  * implemented is that brand new files in the 'dropzone' directory become
//  * invoices, i.e. they are added to database, when a user with canKey==true
//  * requests getOwnQueues. This eliminates the need for WebHoooks and server-side
//  * workers, while also preventing any loss of resources - the first time anyone
//  * will ever need to see the invoice object is when they are being keyed.
//  *
//  * Possible client errors: none. Due to nature of request any error is 500
//  */

var mongoose = require('mongoose');
var _ = require('underscore');
var async = require('async')

const User = mongoose.model('User');
const utils = require('../utils');


var getOwnQueues = (req, res, next) => {
	var userId = req.user._id;

	utils.getOwnQueues(userId, (err, userQueues) => {
		if (err) next(err);

		async.each(userQueues, (queue, callback) => {
			async.each(queue, (invoice, callback) => {
				invoice.populate('_vendor lineItems._activities lineItems._hood lineItems._expense actions._user', (err, populInvoice) => {
					if (err) next(err);

					invoice = populInvoice;

					callback();
				})
			}, callback)
		}, (err) => {
			if (err) next(err);

			res.json(userQueues); // now populated
		})
	})
}






module.exports = getOwnQueues;