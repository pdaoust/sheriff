/**
 * @author Paul d'Aoust
 */

var validator = require('../index');

describe('validator-integer', function () {
	// testing number values
	it('should recognise 3 as a number', function () {
		var result = validator.validate(3, {type: 'number'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 3 as an integer', function () {
		var result = validator.validate(3, {type: 'integer'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 3.145 as a number', function () {
		var result = validator.validate(3.145, {type: 'number'});
		//console.log(result);
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise 3.15 as an integer', function () {
		var result = validator.validate(3.145, {type: 'integer'});
		expect(result.$counts.$total).toBeTruthy();
	});
	// type tests
	it('should not recognise {} as a number or integer', function () {
		var result = validator.validate({}, {type: ['number', 'integer']});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise \'hello\' as a number or integer', function () {
		var result = validator.validate('hello', {type: ['number', 'integer']});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise true as a number or integer', function () {
		var result = validator.validate(true, {type: ['number', 'integer']});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise [3] as a number or integer', function () {
		var result = validator.validate([3], {type: ['number', 'integer']});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise null as a number or integer', function () {
		var result = validator.validate(null, {type: ['number', 'integer']});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise undefined as a number or integer when required', function () {
		var result = validator.validate(undefined, {type: ['number', 'integer'], required: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// minimum tests
	it('should recognise 12 as fitting within minimum 5', function () {
		var result = validator.validate(12, {minimum: 5});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 12 as not fitting within minimum 13', function () {
		var result = validator.validate(12, {minimum: 13});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise 12.01 as fitting within exclusiveMinimum 12', function () {
		var result = validator.validate(12.01, {minimum: 12, exclusiveMinimum: true});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise 12 as fitting within exclusiveMinimum 12', function () {
		var result = validator.validate(12, {minimum: 12, exclusiveMinimum: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// maximum tests
	it('should recognise 12 as fitting within maximum 15', function () {
		var result = validator.validate(12, {maximum: 15});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 12 as fitting within maximum 11', function () {
		var result = validator.validate(12, {maximum: 11});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise 11.99 as fitting within exclusiveMaximum 12', function () {
		var result = validator.validate(11.99, {maximum: 12, exclusiveMaximum: true});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise 12 as fitting within exclusiveMaximum 12', function () {
		var result = validator.validate(12, {maximum: 12, exclusiveMaximum: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// modulo tests
	it('should recognise 12 as divisible by 3', function () {
		var result = validator.validate(12, {divisibleBy: 3});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise 12 as divisible by 5', function () {
		var result = validator.validate(12, {divisibleBy: 5});
		expect(result.$counts.$total).toBeTruthy();
	});
});
