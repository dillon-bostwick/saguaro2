/**
 * 
 */

var laodFromDropzone = require('./loadFromDropzone')

const Invoice = require('mongoose').model('Invoice');

module.exports = (token) => {
	return (callback) => {
		laodFromDropzone(token, (err) => {
			if (err) return callback(err, null);

			Invoice.find().where('canKey').equals('true').exec(callback);
		});
	}
}



