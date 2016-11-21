require('../../app.js')

var invoice = {
	_vendor: { name: 'Marsi Bostwick ~ NT'},
	invNum: '123foo',
	lineItems: [

		{
			category: 'EXPENSE',
			_hood: { shortHand: 'SERN' },
			subHood: 23,
			_activities: [],
			_expense: { name: 'Uncategorized Expenses' },
			amount: 4.00,
			desc: ''
		},

		{
			category: 'WARRANTY',
			_hood: { shortHand: 'SERN' },
			subHood: 23,
			_activities: [],
			amount: 5.00,
			desc: ''
		},

		{
			category: 'CIP',
			_hood: { shortHand: 'SERN' },
			subHood: 24,
			_activities: [{ desc: "Due Diligence"}],
			amount: 53333.99,
			desc: ''
		},

		{
			category: 'CIP',
			_hood: { shortHand: 'SERN' },
			subHood: 26,
			_activities: [{ desc: "Acquisitions Costs"}, { desc: "Due Diligence"}],
			amount: 103934,
			desc: ''
		},

		{
			category: 'CIP',
			_hood: { shortHand: 'SERN' },
			subHood: 13,
			_activities: [{
				  "code": 100,
				  "desc":"Real Estate Purchase"
				 },
				 {
				  "code": 110,
				  "desc":"Acquisitions Costs"
				 },
				 {
				  "code": 115,
				  "desc":"Due Diligence"
				 },
				 {
				  "code": 120,
				  "desc":"Professional Services"
				 },
				 {
				  "code": 122,
				  "desc":"Legal Fees"
				 },
				 {
				  "code": 124,
				  "desc":"Commissions"
				 }],
			amount: 14.95,
			desc: ''
		}
	]
}

module.exports = (require('./billToQbXml.js')(invoice, 1);