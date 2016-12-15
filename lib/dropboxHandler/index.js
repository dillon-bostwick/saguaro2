/**
 * DropboxHandler handles all direct transactions with the
 * Dropbox API, which is a basic HTTP RESTful interface.
 *
 * TODO: Use ES6 class
 */

var request = require('request');

/**
 * @param {String} OAuth 2.0 token of the current user. This is used
 *                 to validate all subsequent requests.
 */
function DropboxHandler(token) {
    this.token = token;
}

////////////////////////////////////////////////////////////////////////////////

/**
 * @param  {String}
 * @param  {Function(error, link)} path of file in user's Dropbox directory
 *          -> error: {Object or null}
 *          -> link: {String} temporary link to downloadable file
 * @return {void}
 */
DropboxHandler.prototype.getLink = function(pathParam, callback) {
    request.post({
        url: 'https://api.dropboxapi.com/2/files/get_temporary_link',
        headers: {
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: pathParam
        })
    },
    handleApiResponse(callback));
}

/**
 * Get binary stream to download file. Note: stream is not standard Node Buffer
 * or recognizable binary array. May require some special parsing
 * 
 * @param  {String}   pathParam
 * @param  {Function} callback
 *         -> error: {Object or null}
 *         -> stream: {Binary}
 * @return {void}
 */
DropboxHandler.prototype.downloadFile = function(pathParam, callback) {
    request.post({
        url: 'https://content.dropboxapi.com/2/files/download',
        headers: {
            'Authorization': 'Bearer ' + this.token,
            'Dropbox-API-Arg': JSON.stringify({
                path: pathParam
            })
        }
    },
    handleApiResponse(callback));
}

/**
 * Get an array of files from a specific directory path. Array elements contain:
 * -	.tag
 * -	name
 * -	path_lower
 * -	path_display
 * -	id
 * Additionally if the element is a file,
 * -	client_modified
 * -	server_modified
 * -	rev
 * -	size
 *
 * The lookup is recursive.
 *
 * 
 * @param  {String}   pathParam
 * @param  {Function(err, res)} callback
 * @return {void}
 */
DropboxHandler.prototype.getDirList = function(pathParam, callback) {
	request.post({
		url: 'https://api.dropboxapi.com/2/files/list_folder',
		headers: {
			'Authorization': 'Bearer ' + this.token,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			path: pathParam,
			recursive: true,
			include_media_info: true,
			include_has_explicit_shared_members: false
		})
	},
	handleApiResponse(callback));
}


/**
 * @param  {String}
 * @param  {String}
 * @param  {Function(error)}
 * @return {void}
 */
DropboxHandler.prototype.moveFile = function(oldPath, newPath, callback) {
    request.post({
        url: 'https://api.dropboxapi.com/2/files/move',
        headers: {
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from_path: oldPath,
            to_path: newPath,
            allow_shared_folder: false,
            autorename: false
        })
    },
    handleApiResponse(callback));
}

/**
 * [deleteFile description]
 * 
 * @param  {[type]}   fileId   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
DropboxHandler.prototype.deleteFile = function(fileId, callback) {
    request.post({
        url: 'https://api.dropboxapi.com/2/files/delete',
        headers: {
            'Authorization': 'Bearer ' + this.token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            path: fileId
        })
    },
    handleApiResponse(callback));
}

////////////////////////////////////////////////////////////////////////////////

function handleApiResponse(callback) {
    return function(err, res, body) {
        if (err || res.statusCode !== 200) {
            return callback(err || res.body, null);
        } else {
            return callback(null, JSON.parse(body) || null);
        }
    }
}



module.exports = DropboxHandler;

