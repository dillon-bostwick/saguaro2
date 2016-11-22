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
//  */

var mongoose = require('mongoose');
var _ = require('underscore');

const User = mongoose.model('User');
const getKeyQueue = require('./getKeyQueue');

/**
 * callback is form (err, queues);
 */
var getOwnQueues = (userId, callback) => {
	var ownQueues;

	User.findById(userId, (err, user) => {
		if (err) return callback(err, null);

		user.deepPopulate('_groups._queue personalQueue', (err, populUser) => {
			if (err) return callback(err, null);

			callback(null, parseUserForQueues(populUser));
		});
	});
}

function parseUserForQueues(populUser) {
	var ownQueues = {};

	if (!_.isEmpty(populUser.personalQueue)) {
		ownQueues['Personal Queue'] = _.pluck(populUser.personalQueue, '_invoice');
	}

	_.each(populUser._groups, (group) => {
		ownQueues[group.name] = group._queue;
	})

	return ownQueues;
}






module.exports = getOwnQueues;
