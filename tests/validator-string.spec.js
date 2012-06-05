/**
 * @author Paul d'Aoust
 */

var validator = require('../index');

describe('validator-string', function () {
	// testing string value
	it('should recognise \'hello\' as a string', function () {
		var result = validator.validate('hello', {type: 'string'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise 3 as a string', function () {
		var result = validator.validate(3, {type: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise {} as a string', function () {
		var result = validator.validate({}, {type: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise true as a string', function () {
		var result = validator.validate(true, {type: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise [\'hello\'] as a string', function () {
		var result = validator.validate(['hello'], {type: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise null as a string', function () {
		var result = validator.validate(null, {type: 'string'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise undefined as a string when a string is required', function () {
		var result = validator.validate(undefined, {type: 'string', required: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise \'hello\' as larger than minLength 3', function () {
		var result = validator.validate('hello', {minLength: 3});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise \'hello\' as smaller than minLength 6', function () {
		var result = validator.validate('hello', {minLength: 6});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise \'hello\' as smaller than maxLength 7', function () {
		var result = validator.validate('hello', {maxLength: 7});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise \'hello\' as larger than maxLength 4', function () {
		var result = validator.validate('hello', {maxLength: 4});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should accept \'hello\' as matching pattern /[A-Za-z]*/', function () {
		var result = validator.validate('hello', {pattern: /[A-Za-z]*/});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should reject \'hello\' as matching pattern /^ello/', function () {
		var result = validator.validate('hello', {pattern: /^ello/});
		expect(result.$counts.$total).toBeTruthy();
	});
});
