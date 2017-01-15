/**
 * Refresh Dropzone - useful if frontend needs to quickly load new files from
 * the Dropzone without requesting getOwnQueues etc.
 */

const utils = require('../utils');
const globals = require('../globals');

var refreshDropzone = (req, res, next) => {
	var user = req.user;

	utils.loadFromDropzone(user.currentToken, (err) => {
		err ? next(err) : res.sendStatus(200);
	})
}

module.exports = refreshDropzone