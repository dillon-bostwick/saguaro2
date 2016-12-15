// Find refs in queues to remove

var mongoose = require('mongoose');
var _ = require('underscore');

const Group = mongoose.model('Group');
const User = mongoose.model('User');

var locateInvoice = require('./locateInvoice')

module.exports = (user, invoiceId, callback) {
	locateInvoice(user, invoiceId, (err, isPersonal, currentGroup) => {
		if (err && err !== 'not found') return next(err);

		if (isPersonal && err !== 'not found') {
			User.findById(user.id, (err, user) => {
				if (err) return next(err);

				// manual pass through to remove because objectId equal not standard
				_.each(user.personalQueue, (ele, i) => {
					if (ele._invoice.equals(invoiceId)) {
						user.personalQueue.splice(i, 1);
					}
				})

				user.save(callback);
			})
		} else if (err !== 'not found') {
			Group.findById(currentGroup.id, (err, group) => {
				if (err) next(err);

				for (var i = 0; i < group._queue.length; i++) {
					if (group._queue[i].equals(invoiceId)) {
						group._queue.splice(i, 1);
					}
				}

				group._queue = _.without(group._queue, invoiceId);

				group.save(callback);
			})
		}
	});
}