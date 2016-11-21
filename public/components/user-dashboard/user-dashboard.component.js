'use strict';

angular.
    module('userDashboard').
    component('userDashboard', {
        templateUrl: 'components/user-dashboard/user-dashboard.template.html',
        controller: function UserDashboardController(api, $window, $q, $location) {
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

            ////////////////////////////////////////////////////////////////////

            // External requests:
            self.Vendors = api.crudResources.Vendor.query();
            self.Hoods = api.crudResources.Hood.query();
            self.Expenses = api.crudResources.Expense.query();
            self.Activities = api.crudResources.Activity.query();
            api.controls.getCurrentUser().then((res) => self.CurrentUser);
            self.invList = api.controls.getOwnQueues();

            self.view = 'QUEUE'; //Must be one of [QUEUE, TEAM, ARCHIVE] - QUEUE by default
            self.currentSorter = self.SORTOPTIONS[0].value;

            //Alerter based on query string
            self.alertMessage = $location.search().alert || '';

            ////////////////////////////////////////////////////////////////////

            self.updateInvList = function() {
                switch(self.view) {
                    case 'QUEUE':
                        self.invList = api.controls.getOwnQueues();
                        break;
                    case 'TEAM':
                        alert('team view function is not ready');
                        break;
                    case 'ARCHIVE':
                        alert('Archive function is not ready!');
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
                var hoods =   _.pluck(invoice.lineItems, '_hood').filter(Boolean);
                var expenses = _.pluck(invoice.lineItems, '_expense').filter(Boolean);

                // populate ids -> names /// TODO: populate on backend first
                hoods = _.map(hoods, function(id) { return self.getElementById(id, 'shortHand', 'Hoods'); });
                expenses = _.map(expenses, function(id) { return self.getNameById(id, 'Expenses'); });

                return  [
                            _.uniq(expenses).join(' | '),
                            _.uniq(hoods).join(' | ')
                        ]
                        .filter(Boolean)
                        .join(' | ')
                        || 'N/A';
            }

            

            /* Given an invoice _id, redirect to the page for that invoice
             */
            self.redirectInvoiceDetail = function(id) {
                $window.location.href = '/#!/invoices/' + id;
            }

            ////////////////////////////////////////////////////////////////////
            //db getters

            /* Given an id and a collection, return the name of that document
             * 
             * Warning: this is reproduced elsewhere (as of writing, in user-dashboard).
             *  Consider moving to core!
             */
            self.getNameById = function(id, collection) {
                var doc = _.findWhere(self[collection], { _id: id })
                
                return doc
                    ?  doc.name
                    || [doc.firstName, doc.lastName].join(' ')
                    : null;
            }

            self.getElementById = function(id, element, collection) {
                var doc = _.findWhere(self[collection], { _id: id })[element];
                
                return doc || null;
            }
		}
    });