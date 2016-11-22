// /**
//  * getKeyQueue.js
//  *
//  * copr. Dillon Bostwick 2016
//  */

// var loadFromDropzone = require('./loadFromDropzone')

// const Group = require('mongoose').model('Group');

// module.exports = (token) => {
// 	return (callback) => {
// 		loadFromDropzone(token, (err) => {
// 			if (err) return callback(err, null);

// 			Group.findOne({ toKey: true }, (err, keyGroup) => {
// 				if (err) return callback(err, null);

// 				keyGroup.populate('_queue', (err, populGroup) => {
// 					return callback(err, populGroup._queue);
// 				});
// 			});
// 		});
// 	}
// }



module.exports = 'stub';