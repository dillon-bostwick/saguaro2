'use strict';

angular.
    module('userDashboard').
    component('userDashboard', {
        templateUrl: 'components/user-dashboard/user-dashboard.template.html',
        controller: function UserDashboardController(api, $window, $q, $location, $scope) {
        	var self = this;
            window.ctrl = self;
            self.path = $window.location.hash

            ////////////////////////////////////////////////////////////////////
            //Constants:

            self.SORTOPTIONS = [
                {
                    desc: 'Service date (oldest first)',
                    value: 'serviceDate'
                },
                {
                    desc: 'Service date (newest first)',
                    value: '-serviceDate'
                },
                {
                    desc: 'Received date (oldest first)',
                    value: 'actions[actions.length - 1].date'
                },
                {
                    desc: 'Received date (newest first)',
                    value: '-actions[actions.length - 1].date'
                },
                {
                    desc: 'Keyed date (oldest first)',
                    value: 'actions[0].date'
                },
                {
                    desc: 'Keyed date (newest first)',
                    value: '-actions[0].date'
                },
                {
                    desc: 'Amount (greatest first)',
                    value: '-amount'
                },
                {
                    desc: 'Amount (least first)',
                    value: 'amount'
                }
            ];

            ///////////////////////////////////////////////////////////////////

            // External requests:

            api.controls.getCurrentUser()
            .then((res) => {
                self.CurrentUser = res.data;
            });

            api.controls.getOwnQueues()
            .then((res) => {
                self.invList = res.data;
                self.ownQueues = res.data;
            });

            api.controls.getTeamQueues()
            .then((res) => {
                self.teamQueues = res.data;
            });

            // UI var onload defaults:

            self.view = 'QUEUE'; //Must be one of [QUEUE, TEAM, ARCHIVE] - QUEUE by default
            self.currentSorter = self.SORTOPTIONS[0].value;
            self.alertMessage = $location.search().alert || ''; // Alerter based on query string
            self.advancedSearchBox = false;

            // advanced search fields:
            self.advancedSearch = {
                mongoQuery: {
                    invNums: [],
                    _vendors: [],
                    _hoods: [],
                    _activities: [],
                    _expenses: [],
                },
                filename: '',
                fileContent: '',
                filenameIncludesLegacy: true,
                filenameIncludesSaguaro: true,
                fileContentIncludesLegacy: true,
                fileContentIncludesSaguaro: true,
                mongoQueryIsIntersectionOnly: false
            };

            ////////////////////////////////////////////////////////////////////

            self.updateInvList = function() {
                switch(self.view) {
                    case 'QUEUE':
                        self.invList = self.ownQueues;
                        break;
                    case 'TEAM':
                        self.invList = self.teamQueues;
                        break;
                    case 'ARCHIVE':
                        self.invList = [];
                        self.simpleArchiveQueryString = '';
                        self.advancedSearchBox = false;
                        self.fillCrudables();
                        break;
                    default:
                        throw new Error;
                }
            }

            /* Given an invoice, return a single string that gives relevant info
             * and a summary of all line items
             */
            self.getDetailStr = function(invoice) {

                // Get lists of ids excluding empty strings
                var hoods =   _.pluck(invoice.lineItems, '_hood')
                              .filter(Boolean);

                var expenses = _.pluck(invoice.lineItems, '_expense').filter(Boolean);

                hoods = _.pluck(hoods, 'shortHand');
                expenses = _.pluck(expenses, 'name');

                return  [
                            _.uniq(expenses).join(' | '),
                            _.uniq(hoods).join(' | ')
                        ]
                        .filter(Boolean)
                        .join(' | ')
                        || 'N/A';
            }

            /* Given an invoice, redirect to the page for that invoice
             */
            self.redirectInvoiceDetail = function(invoice) {
                if (invoice.isLegacy) {
                    $window.location.href = 'https://www.dropbox.com/home' + invoice.path_lower; // just check it out in dropbox
                } else {
                    $window.location.href = '/#!/invoices/' + invoice._id;
                }
            }

            self.simpleArchiveQuery = function() {
                api.controls.queryArchives({
                    simpleQuery: self.simpleArchiveQueryString
                })
                .then((res) => {
                    self.invList = {
                        'Simple Search Results': res.data
                    };
                })
                .catch(console.log);
            }

            self.advancedArchiveQuery = function() {
                api.controls.queryArchives(self.advancedSearch)
                .then((res) => {
                    self.invList = {
                        'Advanced Search Results': res.data
                    };
                })
                .catch(console.log);
            }

            self.fillCrudables = function() {
                if (!self.Vendors) { // and all the rest...
                    self.Vendors = api.crudResources.Vendor.query();
                    self.Hoods = api.crudResources.Hood.query();
                    self.Expenses = api.crudResources.Expense.query();
                    self.Activities = api.crudResources.Activity.query();
                }
            }

            self.refreshDropzone = function() {
                api.controls.refreshDropzone()
                .then((res) => {

                })
                .catch(console.log);
            }
		}
    });
