/**
 * @author Paul d'Aoust
 */

var validator = require('../index');

describe('validator-misc', function () {
	// testing 'any' values
	it('should recognise {} as any', function () {
		var result = validator.validate({}, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [] as any', function () {
		var result = validator.validate([], {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise "hello" as any', function () {
		var result = validator.validate('hello', {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 3 as any', function () {
		var result = validator.validate(3, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise 3.41 as any', function () {
		var result = validator.validate(3.41, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise true as any', function () {
		var result = validator.validate(true, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise false as any', function () {
		var result = validator.validate(false, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise null as any', function () {
		var result = validator.validate(null, {type: 'any'});
		expect(result.$counts.$total).toBeFalsy();
	});
	// value enumeration
	it('should find 3 in enum [3, 4, "hello"]', function () {
		var result = validator.validate(3, {'enum': [3, 4, "hello"]});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not find 3 in enum ["3", 4, "hello"]', function () {
		var result = validator.validate(3, {'enum': ["3", 4, "hello"]});
		expect(result.$counts.$total).toBe(1);
	});
	// instance checking
	it('should recognise cat as an instance of Animal', function () {
		var Animal = function () {};
		var cat = new Animal();
		var result = validator.validate(cat, {'instance': Animal});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise cat as an instance of Object', function () {
		var Animal = function () {};
		var cat = new Animal();
		var result = validator.validate(cat, {'instance': Object});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise hydrangea as an instance of Animal', function () {
		var Animal = function () {};
		var Plant = function () {};
		var hydrangea = new Plant();
		var result = validator.validate(hydrangea, {'instance': Animal});
		expect(result.$counts.$total).toBe(1);
	});
	// disallowed types
	it('should recognise {} as disallowed', function () {
		var result = validator.validate({}, {disallowed: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise [] as disallowed', function () {
		var result = validator.validate([], {disallowed: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise "hello" as disallowed', function () {
		var result = validator.validate('hello', {disallowed: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise 3 as disallowed (integer)', function () {
		var result = validator.validate(3, {disallowed: 'integer'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise 3 as disallowed (number)', function () {
		var result = validator.validate(3, {disallowed: 'number'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise 3.41 as disallowed (number)', function () {
		var result = validator.validate(3.41, {disallowed: 'number'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise 3.41 as disallowed (integer)', function () {
		var result = validator.validate(3.41, {disallowed: 'integer'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise true as disallowed', function () {
		var result = validator.validate(true, {disallowed: 'boolean'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise false as disallowed', function () {
		var result = validator.validate(false, {disallowed: 'boolean'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise null as disallowed', function () {
		var result = validator.validate(null, {disallowed: 'null'});
		expect(result.$counts.$total).toBeTruthy();
	});

});
