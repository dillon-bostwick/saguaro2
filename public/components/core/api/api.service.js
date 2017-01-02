/**
 * api.service.js
 *
 * factory for deprecated v1 api. Use $resource instead of $http because the v1
 * api is a standard RESTful API conforming with basic CRUD operations
 */

'use strict';

angular.
    module('core.api').
    factory('api', ['$resource', '$http', function($resource, $http) {
        var urlPrefix = 'api/v2/';

        var crudModelNames = [
            'Vendor',
            'Activity',
            'Expense',
            'Hood',
            'User'
        ]

        //returns object with $resource for each model
        var crudables = _.object(crudModelNames, _.map(crudModelNames, function(modelName) {
            return $resource(urlPrefix + modelName + '/:id',
            { id: '@_id' },
            {
                update: { method: 'PUT' }
            })
        }));

        var customs = {
            getCurrentUser: () => {
                return $http.get(urlPrefix + 'currentuser');
            },

            getInvoice: (id) => {
                return $http.get(urlPrefix + 'invoice/' + id);
            },

            getOwnQueues: () => {
                return $http.get(urlPrefix + 'ownqueues');
            },

            getTeamQueues: () => {
                return $http.get(urlPrefix + 'teamqueues');
            },

            refreshDropzone: () => {
                return $http.get(urlPrefix + 'refreshdropzone');
            },

            submitInvoice: (invoice, hold, override) => {
                return $http.post(urlPrefix + 'submitinvoice', {
                    invoice: invoice,
                    hold: hold,
                    override: override
                })
            },

            deleteInvoice: (id) => {
                return $http.delete(urlPrefix + 'invoice/' + id);
            },

            archiveInvoice: (id) => {
                return $http.post(urlPrefix + 'archiveinvoice/' + id);
            },

            queryArchives: (query) => {
                return $http.get(urlPrefix + 'archives?' + $.param(query))
            }
        }

        return { crudResources: crudables, controls: customs };
    }])
