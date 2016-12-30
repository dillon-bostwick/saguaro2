/**
 * loadFromDropzone.js
 *
 * Copr. 2016 Dillon Bostwick
 */


var mongoose = require('mongoose');
var async = require('async');
var _ = require('underscore');

const Invoice = mongoose.model('Invoice');
const Group = mongoose.model('Group');

const DropboxHandler = require('../dropboxHandler');
const globals = require('../globals');


/**
 * Scan Dropbox "dropzone" directory and load all the new ones into the database
 * as keyable invoices.
 *
 * @param  {token} String - needed to authenticate dropbox OAuth connection
 * @param  {Function(err)} callback with only error param because no payload
 * @return {void}
*/
var loadFromDropzone = (token, callback) => {
	console.log('Loading from Dropzone');

	var dropboxConnection = new DropboxHandler(token);
	var files;

	dropboxConnection.getDirList(globals.dropzonePath, (err, dirList) => {
		if (err || _.isEmpty(dirList)) return callback(err || null)

		//filter out folders etc
		files = _.where(dirList.entries, { '.tag': 'file' });

		if (_.isEmpty(files)) return callback(null);

		//run fileToActive on each file
		async.each(files, doProcessFileToActive(dropboxConnection), callback);
	});
}

/**
 * processFileToActive
 *
 * returns a function that can then be executed on any Dropbox file object
 *
 * Given a file object from Dropbox, move it to the appropriate place in Dropbox
 * then create a new invoice object to be saved to the database. This is
 * intended for when a new invoice is to be uploaded with core metadata only
 * linked to the file - before a user manually keys the rest of the data.
 *
 * @param  {Object} instance of a DropboxHandler logged in to a user
 * @return {Function(file, callback)}
 *         -> file: file object (see Dropbox)
 *         -> callback is Function(err) because no payload
 */
var doProcessFileToActive = (dropboxConnection) => {
	// returns a function that can be executed on any Dropbox file object
	return (file, callback) => {
		// name of file itself must suffix dir path for moveFile
		var oldPath = file.path_lower;
		var newPath = [globals.currentFilesPath, file.name].join('/');

		var tasks = [
			// #0: Move file from dropzone path to current files path
			(callback) => dropboxConnection.moveFile(oldPath, newPath, callback),
			// #1: make a new invoice object in the databse to correspond and add to the toKey group
			(callback) => {
				var newInvoice = generateInvFromFile(file)

				newInvoice
				.save()
				.then((invoice) => {
					Group.find({}, (err, groups) => {
						_.each(groups, (group) => {
							if (group.toKey) {
								group._queue.push(invoice._id);

								group.save().then((doc) => callback(null))
							}
						})
					});
				});
			}
		];

		async.parallel(tasks, callback);
	}
}


/**
 * makeInvFromFile
 *
 * Given a file object from Dropbox, create a new invoice object to be saved to
 * the database. This is intended for when a new invoice is to be uploaded with
 * core metadata only linked to the file - before a user manually keys the rest
 * of the data.
 *
 * @param  {Object} file object (see Dropbox)
 * @return {Object} invoice object (see Mongoose)
 */
function generateInvFromFile(file) {
	var copyrightChar = String.fromCharCode(169);

	return new Invoice({
		serviceDate: null,
		_vendor: null,
		invNum: null,
		amount: 0,
		lineItems: [],
		actions: [{
			desc: 'File uploaded to the ' + copyrightChar + 'Dropzone',
			date: file.client_modified,
			comment: file.path_display,
			_user: null
		}],
		fileId: file.id,
		fileName: file.name
	});
}


module.exports = loadFromDropzone;
