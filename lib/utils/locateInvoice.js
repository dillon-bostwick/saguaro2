/**
 * 
 */

var mongoose = require('mongoose');
var _ = require('underscore');
const User = mongoose.model('User');


/**
 * Given a user and a targeInvoiceId, find where is 
 *
 * 
 * @param  {query object}   user
 * @param  {ObjectId}   targetInvoiceId
 * @param  {function(err, isPersonal, currentGroup)} callback
 *
 * isPersonal is boolean - true if invoice is in user's personalqueue
 * currentGroup===null means invoice is to bill, else can be full query object or id (if isPersonal)
 * err==='not found' if the search fails. Note that in this case, isPersonal is false and currentGroup is also null
 */
var locateInvoice = (user, targetInvoiceId, callback) => {
	// try personal queues (synchronous)
	for (var i = 0; i < user.personalQueue.length; i++) {
		if (targetInvoiceId.equals(user.personalQueue[i]._invoice)) {
			return callback(null, true, user.personalQueue[i]._nextGroup);
		}
	}


	// try group queues
	User.findById(user._id, (err, userDoc) => {
		if (err) return callback(err, null);

		userDoc.populate('_groups', (err, populUser) => {
			if (err) return callback(err, false, null);

			for (var i = 0; i < populUser._groups.length; i++) {
				var group = populUser._groups[i];

				for (var j = 0; j < group._queue.length; j++) {
					if (group._queue[j].equals(targetInvoiceId)) {
						return callback(null, false, group);
					}
				}
			}

			return callback('not found', false, null); // not found
		});
	});
}





module.exports = locateInvoice;