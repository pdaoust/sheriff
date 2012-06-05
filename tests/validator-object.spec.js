/**
 * @author Paul d'Aoust
 */

var validator = require('../index');

describe('validator-object', function () {
	// testing number values
	it('should recognise {} as an object', function () {
		var result = validator.validate({}, {type: 'object'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise {greeting: \'hello\'} as an object', function () {
		var result = validator.validate({greeting: 'hello'}, {type: 'object'});
		expect(result.$counts.$total).toBeFalsy();
	});
	// type tests
	it('should not recognise [] as an object', function () {
		var result = validator.validate([], {type: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise \'hello\' as an object', function () {
		var result = validator.validate('hello', {type: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise true as an object', function () {
		var result = validator.validate(true, {type: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise 3 as an object', function () {
		var result = validator.validate(3, {type: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise null as an object', function () {
		var result = validator.validate(null, {type: 'object'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise undefined as an object when required', function () {
		var result = validator.validate(undefined, {type: 'object', required: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// property tests
	it('should recognise hash as having all the necessary properties', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': {}
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
					steve: {required: true}
				}
			});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise hash as having all the necessary properties', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
					steve: {required: true}
				}
			});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise hash as having all the necessary properties and allowing it to have extras', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': []
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
				}
			});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise hash as having all the necessary properties but not allowing it to have extras', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': []
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
				},
				additionalProperties: false
			});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise hash as having all the necessary properties and recognise additional properties as okay', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello'
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
				},
				additionalProperties: {type: ['array', 'string']}
			});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise hash as having all the necessary properties but fail on test for additional properties', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello'
			}
			, {
				properties: {
					jim: {required: true},
					bob: {required: true},
					sally: {required: true},
				},
				additionalProperties: {type: ['array', 'integer']}
			});
		expect(result.$counts.$total).toBe(1);
	});
	it('should recognise hash properties by pattern and check them out via a schema', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello'
			}
			, {
				patternProperties: {
					'/[^0-9]/': { type: 'any'}
				},
				additionalproperties: false
			});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise hash properties by pattern and fail a couple of them', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello'
			}
			, {
				patternProperties: {
					'[^0-9]': { type: ['string', 'boolean', 'number']}
				}
			});
		expect(result.$counts.$total).toBe(2);
	});
	it('should recognise hash properties by pattern and disallow all others', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello',
				'johnny5': 'hello you'
			}
			, {
				patternProperties: {
					'^[a-zA-Z]*$': { type: 'any'}
				},
				additionalProperties: false
			}
		);
		expect(result.$counts.$total).toBe(1);
	});
	it('should recognise hash properties by pattern and allow others that have a string value', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello',
				'johnny5': 'hello you'
			}
			, {
				patternProperties: {
					'^[a-zA-Z]*$': { type: 'any'}
				},
				additionalProperties: {title: 'An additional property', type: 'string'}
			});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise hash properties by pattern and disallow others that have a number in their name', function () {
		var result = validator.validate(
			{
				'jim': true,
				'bob': null,
				'sally': 3,
				'steve': [],
				'arianne': 'hello',
				'johnny5': 17
			}
			, {
				patternProperties: {
					'/[^0-9]/': { type: 'any'}
				},
				additionalProperties: {type: 'string'}
			});
		expect(result.$counts.$total).toBeTruthy();
	});
});
