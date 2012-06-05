/**
 * @author Paul d'Aoust
 */

var validator = require('../index');

describe('validator-array', function () {
	// testing number values
	it('should recognise [] as an array', function () {
		var result = validator.validate([], {type: 'array'});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [\'hello\'] as an array', function () {
		var result = validator.validate(['hello'], {type: 'array'});
		expect(result.$counts.$total).toBeFalsy();
	});
	// type tests
	it('should not recognise {} as an array', function () {
		var result = validator.validate({}, {type: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise \'hello\' as an array', function () {
		var result = validator.validate('hello', {type: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise true as an array', function () {
		var result = validator.validate(true, {type: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise 3 as an array', function () {
		var result = validator.validate(3, {type: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise null as an array', function () {
		var result = validator.validate(null, {type: 'array'});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should not recognise undefined as an array when required', function () {
		var result = validator.validate(undefined, {type: 'array', required: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// minimum tests
	it('should recognise [1, 2, 3, 4, 5, 6] as fitting within minItems 5', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {minItems: 5});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [1, 2, 3, 4] as not fitting within minItems 5', function () {
		var result = validator.validate([1, 2, 3, 4], {minItems: 5});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise [1, 2, 3, 4] as fitting within minItems 4', function () {
		var result = validator.validate([1, 2, 3, 4], {minItems: 4});
		expect(result.$counts.$total).toBeFalsy();
	});
	// maximum tests
	it('should recognise [1, 2, 3, 4, 5, 6] as fitting within maxItems 7', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {maxItems: 7});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [1, 2, 3, 4, 5, 6] as not fitting within maxItems 5', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {maxItems: 5});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise [1, 2, 3, 4, 5] as fitting within minItems 4', function () {
		var result = validator.validate([1, 2, 3, 4, 5], {maxItems: 5});
		expect(result.$counts.$total).toBeFalsy();
	});
	// unique tests
	it('should recognise [1, 2, 3, 4, 5, 6] as having all-unique items', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {uniqueItems: true});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [1, 2, 3, 4, 4, 5] as not having all-unique items', function () {
		var result = validator.validate([1, 2, 3, 4, 4, 5], {uniqueItems: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise ["1", "2", "3", "4", 4] as having all unique items', function () {
		var result = validator.validate(["1", "2", "3", "4", 4], {uniqueItems: true});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [null, 0, "0", false] as having all unique items', function () {
		var result = validator.validate([null, 0, "0", false], {uniqueItems: true});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [null, 0, 0, false] as not having all unique items', function () {
		var result = validator.validate([null, 0, 0, false], {uniqueItems: true});
		expect(result.$counts.$total).toBeTruthy();
	});
	// item value tests
	it('should recognise [1, 2, 3, 4, 5, 6] as all matching the schema {type: "number"}', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {items: {type: 'number'}});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise [1, "2", 3, 4, 5, 6] as all matching the schema {type: "number"}', function () {
		var result = validator.validate([1, "2", 3, 4, 5, 6], {items: {type: 'number'}});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise [1, "2", 3, 4, 5, 6] as all matching the schema {type: ["number", "string"]}', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {items: {type: ['number', 'string']}});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should recognise [1, {}, 3, 4, 5, 6] as all matching the schema {type: ["number", "object"]}', function () {
		var result = validator.validate([1, {}, 3, 4, 5, 6], {items: {type: ['number', 'object']}});
		expect(result.$counts.$total).toBeFalsy();
	});
	// tuple tests
	it('should recognise [1, "2", 0.3, null, {}, [1, 2, 3]] as all matching the fancy tuple schema', function () {
		var result = validator.validate([1, "2", 0.3, null, {}, [1, 2, 3]], {items:
			[
				{type: 'integer'},
				{type: 'string'},
				{type: 'number', maximum: 0.4},
				{type: ['null', 'boolean']},
				{type: 'object'},
				{type: 'array', maxItems: 3, items: {type: 'integer'}}
			]
		});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise [1, "2", 0.3, null, {}, [1, 2, 3]] as all matching the fancy tuple schema', function () {
		var result = validator.validate([1, "2", 0.3, null, {}, [1, 2, 3]], {items:
			[
				{type: 'integer'},
				{type: 'string', enum: 'fred'},
				{type: 'number', maximum: 0.4},
				{type: ['null', 'boolean']},
				{type: 'object'},
				{type: 'array', maxItems: 3, items: {type: 'integer'}}
			]
		});
		expect(result.$counts.$total).toBeTruthy();
	});
	it('should recognise [1, "2", 0.3, null, {}, [1, 2, 3], "steve", "jim", "fred"] as all matching the fancy tuple schema with additional items', function () {
		var result = validator.validate([1, "2", 0.3, null, {}, [1, 2, 3], "steve", "jim", "fred"], {items:
			[
				{type: 'integer'},
				{type: 'string'},
				{type: 'number', maximum: 0.4},
				{type: ['null', 'boolean']},
				{type: 'object'},
				{type: 'array', maxItems: 3, items: {type: 'integer'}}
			], additionalItems: {type: 'string'}
		});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise [1, "2", 0.3, null, {}, [1, 2, 3], "steve", "jim", false] as all matching the fancy tuple schema with additional items', function () {
		var result = validator.validate([1, "2", 0.3, null, {}, [1, 2, 3], "steve", "jim", false], {items:
			[
				{type: 'integer'},
				{type: 'string'},
				{type: 'number', maximum: 0.4},
				{type: ['null', 'boolean']},
				{type: 'object'},
				{type: 'array', maxItems: 3, items: {type: 'integer'}}
			], additionalItems: {type: 'string'}
		});
		expect(result.$counts.$total).toBeTruthy();
	});
	// array value enumeration tests
	it('should recognise [1, 2, 3, 4, 5, 6] as being one of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6], {items: {enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}});
		expect(result.$counts.$total).toBeFalsy();
	});
	it('should not recognise one of the values from [1, 2, 3, 4, 5, 6, 10] as being one of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]', function () {
		var result = validator.validate([1, 2, 3, 4, 5, 6, 10], {items: {enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}});
		expect(result.$counts.$total).toBeTruthy();
	});
});
