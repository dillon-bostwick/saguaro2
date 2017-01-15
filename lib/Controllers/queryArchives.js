
// query:
//  -simpleQuery (string or null if advanced query is selected)
//  -mongoQuery (Object or null if not part of search parameters)
    //  - invNums: [string]
    //  - _vendors: [ObjectId string]
    //  - _hoods: [ObjectId string]
    //  - _activities: [ObjectId string]
    //  - _expenses: [ObjectId string]
//  -filename (string or null if not part of search parameters)
//  -fileContentMatch (string or null if not part of search parameters)
//  -filenameIncludesLegacy (boolean)
//  -filenameIncludesSaguaro (boolean)
//  -fileContentMatchIncludesLegacy (boolean)
//  -fileContentMatchIncludesSaguaro (boolean)
//  -mongoQueryIsIntersectionOnly (boolean)

var async = require('async');
var mongoose = require('mongoose');
var _ = require('underscore');

const Archive = mongoose.model('Archive');
const Vendor = mongoose.model('Vendor');
const Hood = mongoose.model('Hood');
const Activity = mongoose.model('Activity');
const Expense = mongoose.model('Expense');
const DropboxHandler = require('../dropboxHandler');
const globals = require('../globals');

var queryArchives = (req, res, next) => {
    var query = req.query;
	var dropboxConnection = new DropboxHandler(req.user.currentToken);

    if (query.simpleQuery) {
        processSimpleQuery(req.query.simpleQuery, dropboxConnection, handleFinalResults(res, next));
    } else {
        processAdvancedQuery(req.query, dropboxConnection, handleFinalResults(res, next));
    }
}

function handleFinalResults(res, next) {
    return (err, results) => {
        if (err) return next(err);

        results = _.flatten(results);
        results = _.uniq(results);

        console.log(results);

        return res.json(results);
    }
}

function processSimpleQuery(stringToQuery, dropboxConnection, callback) {
    async.parallel([
        processDropboxSearch(true, stringToQuery, dropboxConnection, true, true),
        mongoQueryFromSimpleString(stringToQuery)
    ], callback);
}

//Search vendors, hoods, activities, and expenses for a name match and then use
//any matched ids to search archives
function mongoQueryFromSimpleString(stringToQuery) {
    return (callback) => {
        var mongoQuery = { invNums: [stringToQuery] };

        async.parallel([
            (callback) => {
                Vendor.find({ name: stringToQuery }, (err, matchedVendors) => {
                    mongoQuery._vendors = _.pluck(matchedVendors, '_id');
                    return callback(err);
                });
            },

            (callback) => {
                Hood.find({
                    $or: [
                        { name: stringToQuery },
                        { shortHand: stringToQuery }
                    ]
                }, (err, matchedHoods) => {
                    mongoQuery._hoods =  _.pluck(matchedHoods, '_id');
                    return callback(err);
                });
            },

            (callback) => {
                Activity.find({
                    $or: [
                        { code: parseInt(stringToQuery) || -1 },
                        { desc: stringToQuery }
                    ]
                }, (err, matchedActivities) => {
                    mongoQuery._activities = _.pluck(matchedActivities, '_id');
                    return callback(err);
                });
            },

            (callback) => {
                Expense.find({ name: stringToQuery }, (err, matchedExpense) => {
                    mongoQuery._expenses = _.pluck(matchedExpense, '_id');
                    return callback(err);
                });
            }
        ], (err) => {
            if (err) return callback(err, null);

            processMongoQuery(mongoQuery, false)(callback);
        });
    }
}

function processAdvancedQuery(query, dropboxConnection, callback) {
    var funcsToProcess = [];

    if (query.mongoQuery) {
        funcsToProcess.push(processMongoQuery(query.mongoQuery, query.mongoQueryIsIntersectionOnly === 'true'));
    }

    if (query.filename) {
        funcsToProcess.push(processDropboxSearch(false, query.filename, dropboxConnection, query.filenameIncludesLegacy === 'true', query.filenameIncludesSaguaro === 'true'));
    }

    if (query.fileContentMatch) {
        funcsToProcess.push(processDropboxSearch(true, query.fileContentMatch, dropboxConnection, query.fileContentMatchIncludesLegacy === 'true', query.fileContentMatchIncludesSaguaro === 'true'));
    }

    async.parallel(funcsToProcess, callback);
}

//canBeAny -> use $or
//!canBeAny -> use $and
function processMongoQuery(mongoQuery, isIntersectionOnly) {
    return (callback) => {
        var searchOperator = (isIntersectionOnly ? '$and' : '$or');
        var queryObj = {};

        //mongoQuery = JSON.parse(mongoQuery);

        queryObj[searchOperator] = [];

        if (!_.isEmpty(mongoQuery.invNums)) {
            queryObj[searchOperator].push({
                'invNum': { $in: mongoQuery.invNums }
            });
        }

        if (!_.isEmpty(mongoQuery._vendors)) {
            queryObj[searchOperator].push({
                '_vendor': { $in: mongoQuery._vendors }
            });
        }

        if (!_.isEmpty(mongoQuery._hoods)) {
            queryObj[searchOperator].push({
                'lineItems': { $elemMatch: { '_hood': { $in: mongoQuery._hoods } } }
            });
        }

        if (!_.isEmpty(mongoQuery._activities)) {
            queryObj[searchOperator].push({
                'lineItems': { $elemMatch: { '_activities': { $in: mongoQuery._activities } } }
            });
        }

        if (!_.isEmpty(mongoQuery._expenses)) {
            queryObj[searchOperator].push({
                'lineItems': { $elemMatch: { '_expense': { $in: mongoQuery._expenses } } }
            });
        }

        Archive.find(queryObj, (err, results) => {
            if (err) return callback(err, null);
            if (!results) return callback(err, []);

            async.map(results, (invoice, callback) => {
                invoice.populate('_vendor lineItems._activities lineItems._hood lineItems._expense actions._user', callback);
            }, callback)
        });
    }
}

function processDropboxSearch(includeContent, stringToMatch, dropboxConnection, includeLegacy, includeSaguaro) {
    console.log(includeContent, stringToMatch, dropboxConnection, includeLegacy, includeSaguaro);

    return (callback) => {
        var allResults = [];

        var targetPaths = includeLegacy ? _.clone(globals.legacyArchivePaths) : [];
        if (includeSaguaro) targetPaths.push(globals.archivePath);

        if (_.isEmpty(targetPaths)) return callback(null, [])

        async.each(targetPaths, (path, callback) => {
            dropboxConnection.search(includeContent, stringToMatch, path, (err, results) => {
                if (err) return callback(err);

                // only show metadata, filter out folders, and remove dupes
                results = _.pluck(results.matches, 'metadata');
                results = _.where(results, { '.tag': 'file' });
                results = _.uniq(results);

                if (path === globals.archivePath) { // i.e. this is not legacy therefore it must exist somewhere in mongo as well.
                    var archiveDocsOfResults = [];

                    async.each(results, (result, callback) => {
                        Archive.find({ fileId: result.id }, (err, archiveDocs) => {
                            if (err) return callback(err);
                            if (_.isEmpty(archiveDocs)) return callback('ERROR: A file was found in Dropbox archive path that is missing its corresponding database document');
                            if (archiveDocs.length > 1) return callback('ERROR: multiple invocie metadata reference the same Dropbox fileId')

                            archiveDocsOfResults = archiveDocsOfResults.concat(archiveDocs[0]);

                            return callback(null);
                        });
                    }, (err) => {
                        if (err) return callback(err);
                        allResults = allResults.concat(archiveDocsOfResults);
                        return callback(null);
                    });
                } else { // this is a file found in legacy - just send back the dropbox metadata instead of the archive document.
                    _.each(results, (result) => {
                        result.isLegacy = true;
                    });

                    allResults = allResults.concat(results);
                    return callback(null);
                }
            });
        }, (err) => {
            return callback(err, allResults);
        });
    }
}

module.exports = queryArchives;
