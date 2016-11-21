/**
 * expense.js
 */

var mongoose = require('mongoose');

var expenseSchema = new mongoose.Schema({
	name: String
});

module.exports = mongoose.model('Expense', expenseSchema, 'expenses');