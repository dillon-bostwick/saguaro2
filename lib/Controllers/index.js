/**
 * requestProvider defines functions for every direct transactions. They are all
 * passed req and cb. Data corresponds with the body of the request user is an object
 * providing all user data. requestHandlers will only
 * be called after the user authentication is validated, meaning that these
 * functions should only deal with underlying request logic.
 */

module.exports = {
	getInvoice: require('./getInvoice'),
	getOwnQueues: require('./getOwnQueues'),
	submitInvoice: require('./submitInvoice'),
	refreshDropzone: require('./refreshDropzone'),
	deleteInvoice: require('./deleteInvoice'),
	getCurrentUser: require('./getCurrentUser'),
	archiveInvoice: require('./archiveInvoice'),
	getTeamQueues: require('./getTeamQueues')
};
