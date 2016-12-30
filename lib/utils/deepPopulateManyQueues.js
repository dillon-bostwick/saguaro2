var async = require('async');
var mongoose = require('mongoose');
const Invoice = mongoose.model('Invoice');

module.exports = (queues, callback) => {
    async.each(queues, (queue, callback) => {
        async.each(queue, (invoice, callback) => {
            console.log(invoice);

            invoice.populate('_vendor lineItems._activities lineItems._hood lineItems._expense actions._user', (err, populInvoice) => {
                if (err) return callback(err);

                invoice = populInvoice;

                return callback(null);
            })
        }, callback)
    }, (err) => {
        return callback(err || null, queues);
    });
}
