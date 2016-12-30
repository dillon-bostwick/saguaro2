
// query:
//  -simpleQuery (string or null if advanced query is selected)
//  -mongoQuery (Object or null if not part of search parameters)
//  -filename (string or null if not part of search parameters)
//  -fileContentMatch (string or null if not part of search parameters)
//  -filenameIncludesLegacy (boolean)
//  -filenameIncludesSaguaro (boolean)
//  -fileContentMatchIncludesLegacy (boolean)
//  -fileContentMatchIncludesSaguaro (boolean)
//
// mongoQuery can have any of the following:
//  - invNums: [string]
//  - _vendors: [ObjectId string]
//  - _hoods: [ObjectId string]
//  - _activities: [ObjectId string]
//  - _expenses: [ObjectId string]

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
        processSimpleQuery(req.query, dropboxConnection, handleFinalResults(res, next));
    } else {
        processAdvancedQuery(req.query, dropboxConnection, handleFinalResults(res, next));
    }
}

function handleFinalResults(res, next) {
    return (err, results) => {
        if (err) return next(err);

        results = _.flatten(results);
        results = _.uniq(results, (result) => {
            // we want to compare ids regardless of whether it is fileId of mongo archives document or id of a legacy dropbox metadata
            return result.isLegacy ? result.id : result.fileId
        });

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
        var mongoQuery = { invNum: stringToQuery };

        async.parallel([
            (callback) => {
                Vendor.find({ name: stringToQuery }, (err, matchedVendor) => {
                    if (err) return callback(err);
                    mongoQuery._vendors = _.isEmpty(matchedVendor) ? [] : [matchedVendor[0].id];
                    return callback(null);
                });
            },

            (callback) => {
                Hood.find({
                    $or: [
                        { name: stringToQuery },
                        { shortHand: stringToQuery }
                    ]
                }, (err, matchedHood) => {
                    if (err) return callback(err);
                    mongoQuery._hoods =  _.isEmpty(matchedHood) ? [] : [matchedHood[0].id];
                    return callback(null);
                });
            },

            (callback) => {
                Activity.find({
                    $or: [
                        { code: stringToQuery },
                        { desc: stringToQuery }
                    ]
                }, (err, matchedActivity) => {
                    if (err) return callback(err);
                    mongoQuery._activities = _.isEmpty(matchedActivity) ? [] : [matchedActivity[0].id];
                    return callback(null);
                });
            },

            (callback) => {
                Expense.find({ name: stringToQuery }, (err, matchedExpense) => {
                    if (err) return callback(err);
                    mongoQuery._expenses = _.isEmpty(matchedExpense) ? [] : [matchedExpense[0].id];
                    return callback(null);
                });
            }
        ], (err) => {
            if (err) return callback(err, null);
            processMongoQuery(mongoQuery, callback);
        });
    }
}

function processAdvancedQuery(query, dropboxConnection, callback) {
    var funcsToProcess = [];

    if (query.mongoQuery) {
        funcsToProcess.push(processMongoQuery(query.mongoQuery));
    }

    if (query.filename) {
        funcsToProcess.push(processDropboxSearch(false, query.filename, dropboxConnection, query.filenameIncludesLegacy === 'true', query.filenameIncludesSaguaro === 'true'));
    }

    if (query.fileContentMatch) {
        funcsToProcess.push(processDropboxSearch(true, query.fileContentMatch, dropboxConnection, query.fileContentMatchIncludesLegacy === 'true', query.fileContentMatchIncludesSaguaro === 'true'));
    }

    async.parallel(funcsToProcess, callback);
}

function processMongoQuery(mongoQuery) {
    return (callback) => {
        mongoQuery = JSON.parse(mongoQuery);

        var queryObj = {
            $or: [
                { 'invNum': { $in: mongoQuery.invNums || [] } },
                { '_vendor': { $in: mongoQuery._vendors || [] } },
                { 'lineItems._hood': { $in: mongoQuery._hoods || [] } },
                { 'lineItems._activities': { $in: mongoQuery._activities || [] } },
                { 'lineItems._expenses': { $in: mongoQuery._expenses || [] } }
            ]
        };

        queryObj = {
            'lineItems._hood': { }"58001a6fbc2bfdd43e2c4d4c"
        };

        Archive.find(queryObj, console.log);
    }
}

function processDropboxSearch(includeContent, stringToMatch, dropboxConnection, includeLegacy, includeSaguaro) {
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
