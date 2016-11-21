/**
 * submitInvoice.js
 * Dillon Bostwick
 */

/**
 * @param  {Object} This is a 1:1 map of invoice in database
 * @param  {Object} 
 * 			-> _user: (String) Mongo ID of request submitter
 *		 	-> isNew: (Boolean) used to assert a db lookup error. Request will fail
 *                    if this doesn't correlate with existence of invoice id in
 *				      database
 * @param  {Function(error)}
 * 			-> error: Object or null
 * @return {void}
 *
 * NOTE: more elements can be added to meta later such as if pipeline override
 * feature must be implemented, or if a fileUri must get passed from frontend
 * for a browser-based file upload
 */
var submitInvoice = function(invoice, meta, callback) {
	var validationError = validateInvoice(invoice);

	if (validationError) {
		throw new Error(validationError);
	}

	//TODO: STEPS (and this will require carefully navigating callback hell) lookup in database fail if isNew !== (id in db) get pipeline from database 
	//find next pipeline

	//push to queue of all next pipeline

	//if new, then move dropbox file to appropriate location

	//DropboxID should be generated for the invoice here, and NOT on the frontend


	//..... execute callback(error) when finished

	catch(error) {
		callback(error);
		return;
	} finally {
		callback(null);
	}
}

/**
 * @param  {Object} invoice object to be evaluated
 * @return {Object} String describing an error, or null if validation passes
 *
 *  throws an error if validation of invoice object fails. Purpose is for
 *  preliminary backend validation in case client sends bad object.
 */
function validateInvoice(invoice) {
	//TODO
}

/**
 * @param  {String}
 * @param  {Function(error, createdNew)}
 * 			-> error: Object or null
 *      	-> createdNew: (Boolean) true if invoice did not already exist
 * @return {void}
 *
 * actions:
 *   If the invoice _id exists in the database, will update the old invoice to
 *   match the one passed. Otherwise, will create a new document in the database
 *   for that invoice.
 */
function findOrCreate(invoiceId, callback) {
	//TODO
}

/**
 * @param  {String}
 * @param  {Function(error, receiverId)}
 * 			-> error: (Object or null) if Mongo lookup fails
 *      	-> receiverId: (String) Mongo id of user that is next in pipeline
 * @return {Mongo reference id of user to receive the invoice}
 */
function getNextUserInPipeline(submitterId, callback) {
	//TODO
}
/**
 * @param  {String}
 * @param  {Function(error)}
 * @return {void}
 */
function pushToUserQueue(userId, callback) {
	//TODO
}

/**
 * @param  {String}
 * @param  {Function(error0)}
 * @return {void}
 */
function popFromUserQueue(userId, callback) {
	//TODO
}


module.exports = submitInvoice;
