/**
 * @author Paul d'Aoust
 */

var is = require('wrangler').is;
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

	// functions
	it('should validate obj\'s address against a custom function in schema and fail because the country is non-Canadian', function () {
		var obj = {
			province: 'BC',
			country: 'USA'
		};
		var schema = {
			properties: {
				province: {},
				country: {
					'function': function (val, fullObj) {
						var provinces = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'etc'];
						if (val !== 'Canada'
							&& is.inArray(fullObj.province, provinces)) {
							return 'Gave a Canadian province, but country was given as '+val;
						}
					}
				}
			}
		};
		var result = validator.validate(obj, schema);
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should validate obj\'s address against a custom function in schema and succeed because the country is Canadian', function () {
		var obj = {
			province: 'BC',
			country: 'Canada'
		};
		var schema = {
			properties: {
				province: {},
				country: {
					'function': function (val, fullObj) {
						var provinces = ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'etc'];
						if (val !== 'Canada'
							&& is.inArray(fullObj.province, provinces)) {
							return 'Gave a Canadian province, but country was given as '+val;
						}
					}
				}
			}
		};
		var result = validator.validate(obj, schema);
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should validate obj\'s properties with a custom function in obj and fail because the widget has too few throbneys', function () {
		var obj = {
			floobers: 20,
			widget: {
				slabsters: 15,
				throbneys: 17,
				validator: function (val, fullObj) {
					if (val.throbneys < fullObj.floobers + fullObj.widget.slabsters) {
						return 'throbneys must be equal to or greater than sum of floobers and slabsters';
					}
				}
			}
		}
		var schema = {
			properties: {
				floobers: 'number',
				widget: {
					hasValidator: 'validator'
				}
			}
		};
		var result = validator.validate(obj, schema);
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should validate obj\'s properties with a custom function in obj and succeed because the widget has enough throbneys', function () {
		var obj = {
			floobers: 20,
			widget: {
				slabsters: 15,
				throbneys: 36,
				validator: function (val, fullObj) {
					if (val.throbneys < fullObj.floobers + fullObj.widget.slabsters) {
						return 'throbneys must be equal to or greater than sum of floobers and slabsters';
					}
				}
			}
		}
		var schema = {
			properties: {
				floobers: 'number',
				widget: {
					hasValidator: 'validator'
				}
			}
		};
		var result = validator.validate(obj, schema);
		expect(result.$counts.$total).toBeFalsy();
	});

});
