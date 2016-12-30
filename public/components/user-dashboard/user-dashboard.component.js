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

            api.controls.getCurrentUser().then((res) => {
                self.CurrentUser = res.data;
            });

            api.controls.getOwnQueues().then((res) => {
                self.invList = res.data;
                self.ownQueues = res.data;
            });

            api.controls.getTeamQueues().then((res) => {
                self.teamQueues = res.data;
            });

            self.view = 'QUEUE'; //Must be one of [QUEUE, TEAM, ARCHIVE] - QUEUE by default
            self.currentSorter = self.SORTOPTIONS[0].value;

            // Alerter based on query string
            self.alertMessage = $location.search().alert || '';

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

            /* Given an invoice _id, redirect to the page for that invoice
             */
            self.redirectInvoiceDetail = function(id) {
                $window.location.href = '/#!/invoices/' + id;
            }
		}
    });
