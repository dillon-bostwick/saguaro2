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

const User = mongoose.model('User');
const utils = require('../utils');


var getOwnQueues = (req, res, next) => {
	var ownQueues;

	User.findById(req.user._id, (err, user) => {
		if (err) return next(err);

		user.deepPopulate('_groups._queue _personalQueue', (err, populUser) => {
			if (err) return next(err);

			if (populUser.canKey) {
				utils.getKeyQueue(user.currentToken)((err, toKeyQueue) => {
					ownQueues = parseUserForQueues(populUser);

					if (!_.isEmpty(toKeyQueue)) {
						ownQueues['To Key'] = toKeyQueue;
					}

					res.json(ownQueues)
				});
			} else {
				res.json(parseUserForQueues(populUser));
			}
		});
	});
}

function parseUserForQueues(populUser) {
	var ownQueues = {};

	if (!_.isEmpty(populUser._personalQueue)) {
		ownQueues['Personal Queue'] = populUser._personalQueue;
	}

	_.each(populUser._groups, (group) => {
		ownQueues[group.name] = group._queue;
	})

	return ownQueues;
}






module.exports = getOwnQueues;