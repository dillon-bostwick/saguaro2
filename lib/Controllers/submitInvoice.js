/**
 *
 * Possible client errors: 400, 403, 404, 422
 */

var mongoose = require('mongoose');

const Invoice = mongoose.model('Invoice');

var submitInvoice = function(req, res, next) {
	var newInvoice = req.body.invoice;
	var valErr;

	// malformed request (i.e. pre deeper validation)
	if (!newInvoice || !newInvoice._id) return res.sendStatus(400);

	(new Invoice(newInvoice)).validate((logicalValErr) => { // custom logical validation
		if (logicalValErr) return res.status(422).send(logicalValErr);

		locateInvoice((permissionErr, currentGroup) => {
			// user not allowed to submit invoice
			if (permissionErr) return res.status(403).send(permissionErr);

			Invoice.findById(newInvoice._id, (lookupErr, oldInvoice) => {
				if (lookupErr) return next(lookupErr);
				if (!oldInvoice) return res.sendStatus(404);

				// custom user-requirements validation
				customValErr = validateAgainstCustoms(oldInvoice, newInvoice, req.user, currentGroup); 

				if (customValErr) return res.status(403).send(customValErr);

				moveInvoice(newInvoice, currentGroup, (err) => {
					if (err) {
						// multiple possible error codes - see moveInvoice definition
						res.status(err.statusCode).send(err.message); 
					} else {
						res.sendStatus(200);
					}
				});
			});
		})
	});
}


/**
 * [validateAgainstCustoms description]
 * @param  {[type]} invoice [description]
 * @param  {[type]} user    [description]
 * @param  {[type]} group   [description]
 * @return {[type]}         [description]
 */
function validateAgainstCustoms(oldInvoice, newInvoice, user, group) {
	return null; // string if error, null if pass
}

/**
 * [checkUserQueue description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
function locateInvoice(callback) {

	//null seecond argument ALWAYS means that it is in fact in user's own queue.
	callback(null, { id: 'foo' });
};

/**
 * [moveInvoice description]
 * @param  {[type]}   existingInvoice [description]
 * @param  {[type]}   currentGroup    [description]
 * @param  {Function} callback        [description]
 * @return {[type]}                   [description]
 *
 * Callback signature only has err argument
 */
function moveInvoice(newInvoice, currentGroup, callback) {
	// is ready to bill?
	// 		parse to qbxml and then add to bill in db
	// 		Move to archives in dropbox
	// 	else
	// 		pop from the current group / isnew = false / pop from current queue, then
	// 		push to the right next place (possibility of 404ing)

	var err = {
		statusCode: 420,
		message: 'foo'
	}

	callback(null, null);
}







module.exports = submitInvoice;

