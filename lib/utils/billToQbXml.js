/**
 * billToQbXml.js
 *
 * Copr. 2016 Dillon Bostwick
 */

var builder = require('xmlbuilder');
var Money = require('js-money');
var assert = require('assert');
var _ = require('underscore');


/**
 * Given a populated invoice object, return a QbXml string.
 *
 * qbXML reference:
 * https://developer-static.intuit.com/qbsdk-current/common/newosr/index.html
 * 
 * @param  {Object} populatedInvoice [Must be already populated when called]
 * @param  {String or Number} requestId [Useful for sending series of requests]
 * @return {String} [The valid qbXml to be sent directly to QuickBooks SDK]
 */
var billToQbXml = (populatedInvoice, requestId) => {
    console.log(populatedInvoice._id + " was not properly converted to qbxml");
    return "foobar";

    requestId = requestId.toString();

    var cipLines = _.where(populatedInvoice.lineItems, { category: 'CIP' });
    var expenseLines = _.where(populatedInvoice.lineItems, { category: 'EXPENSE' });
    var warrantyLines = _.where(populatedInvoice.lineItems, { category: 'WARRANTY' });

    // Final lines to be exported to QuickBooks as 'bill' lines. qbExpenseLines
    // includes both expenses and warranties (although items are different) and
    // cipLines must first get divided per activity before becoming qbItemLines
    var qbExpenseLines = expenseLines.concat(warrantyLines);
    var qbItemLines = flattenByActivities(cipLines);

    // General invoice metadata
	var qbXml = builder.create('QBXML', { version: '1.0'})
					 .instruction('qbxml', 'version="13.0"')
                     .ele('QBXMLMsgsRq', { onError: 'continueOnError' })
                        .ele('BillAddRq', { requestID: requestId })
                            .ele('BillAdd')
                                .ele('VendorRef')
                                    .ele('FullName')
                                        .text(populatedInvoice._vendor.name)
                                    .up()
                                .up()
                                .ele('RefNumber')
                                    .text(populatedInvoice.invNum)
                                .up()
	
    // Add QB expense lines
	_.each(qbExpenseLines, (expenseLine) => {
        assert(expenseLine.category === 'WARRANTY' || expenseLine._expense);

		qbXml.ele('ExpenseLineAdd')
				.ele('AccountRef')
                    .ele('FullName') // expense name or 'Warranty'
                        .text(expenseLine.category === 'WARRANTY'
                              ? 'Warranty'
                              : expenseLine._expense.name)
                    .up()
                .up()
                .ele('Amount')
                    .text(expenseLine.amount)
                .up()
                .ele('Memo')
                    .text(expenseLine.desc || 'No memo')
                .up()
                .ele('ClassRef') // pretty lot of warranty
                    .ele('FullName')
                        .text(expenseLine.category === 'WARRANTY'
                              ? getPrettyLot(expenseLine)
                              : '')
                        .up()
                    .up()
                .up()
            .up()
	});

    // Add QB item lines
	_.each(qbItemLines, (itemLine) => {
		qbXml.ele('ItemLineAdd')
				.ele('ItemRef') // activity description
                    .ele('FullName')
                        .text(itemLine.activity.desc)
                    .up()
                .up()
                .ele('Desc')
                    .text(itemLine.desc || 'No memo')
                .up()
                .ele('Amount')
                    .text(itemLine.amount)
                .up()
                .ele('CustomerRef') // pretty lot
                    .ele('FullName')
                        .text(getPrettyLot(itemLine))
                    .up()
                .up()
            .up()
	});                                    

	return qbXml.end();
}

/**
 * Given an array of lines with a nested array of activities, flatten to an
 * array of lines with only a single activity per line. The amount of the old
 * line is divvied among the new lines.
 *
 * Assumptions: a CIP line never has empty _activities (this should be
 * pre-validated)
 * 
 * @param  {Array of database-style lineItems} nonExpenseLines
 * @return {Array of QuickBooks-style itemLines}
 */
function flattenByActivities(cipLines) {
    var qbItemLines = [];
    var sharesDivvied;
    var qbItemLine;

    _.each(cipLines, (line) => {
        assert(!_.isEmpty(line._activities));

        sharesDivvied = divvyAmount(line.amount, line._activities.length);

        _.each(line._activities, (activity, i) => {
            qbItemLine = copy(line);

            qbItemLine.activity = activity;
            qbItemLine.amount = sharesDivvied[i];

            delete qbItemLine._activities;

            qbItemLines.push(qbItemLine);
        });
    });

    return qbItemLines
}

/**
 * Returns array of amounts by divying up the amount by the quantity of
 * receivers. Rounds to the nearest cent while still accounting for rounding
 * errors due to remainders. In this case each final amount should never deviate
 * by more than a cent
 *
 * Accurate rounding is acheived with the Money.allocate method. See docs here:
 * https://www.npmjs.com/package/js-money
 * 
 * @param  {Number} amount    [ amount to divide]
 * @param  {Number} quantity  [integer - number of receivers]
 * @return {Array of Numbers} [how much each receiver gets]
 */
function divvyAmount(amount, quantity) {
    // Get array of Moneys
    var divvyedMoneys = (Money.fromDecimal(amount, Money.USD))
                        .allocate(Array(quantity).fill(1));

    // The amount property of a Money is an integer representing cents
    return _.map(divvyedMoneys, (divvyedMoney) => {
        return divvyedMoney.amount / 100;
    })
}

/**
 * Given a lineItem, get the pretty lot name string, e.g. 'HGR 750'
 * 
 * @param  {Object} lineItem
 * @return {String}
 */
function getPrettyLot(lineItem) {
    return [lineItem._hood.shortHand, lineItem.subHood].join(' ')
}

module.exports = billToQbXml;