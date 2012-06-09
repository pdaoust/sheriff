(function (exports) {
	var ValidationError,
		ErrorContainer,
		is = require('is-helpers');

	/* ValidationError constructor; creates a simple ValidationError object with
	 * the error level, an error message explaining what went wrong, and the
	 * title of the current schema, if it has one */
	exports.ValidationError = ValidationError = function (level, message, title) {
		if (is.object(level)) {
			message = level.message;
			title = level.title;
			level = level.level;
		}
		this.level = level || 'fail';
		this.message = message || 'Unspecified';
		this.title = title || 'Unspecified';
	};

	ValidationError.prototype = Error.prototype;

	/* ErrorContainer constructor; holds a counter to tally the total number of
	 * errors (optionally, with error levels if you're using them), plus an
	 * array of all the ValidationErrors themselves. Takes an optional
	 * ValidationError object to start the ball rolling. */
	var ErrorContainer = exports.ErrorContainer = function ErrorContainer (error) {
		// hey wait! Is this already an error container?
		if (typeof error === 'object' && error instanceof ErrorContainer) {
			return error;
		}
		// create the error container
		this.$counts = { $total: 0 };
		this.$messages = [];
		if (error === true || error === null || error === undefined) {
			return;
		}
		if (!(error instanceof ValidationError)) {
			error = new ValidationError(null, error);
		}
		this.addError(error);
	};

	/* merge two ErrorContainer instances together recursively, updating error
	 * totals for each node as needed */
	ErrorContainer.merge = function (oldCon, newCon) {
		var i;
		if (oldCon === undefined) {
			return newCon;
		}
		for (i in newCon.$counts) {
			if (newCon.$counts.hasOwnProperty(i)) {
				oldCon.countError(i, newCon.$counts[i]);
			}
		}
		oldCon.$messages = oldCon.$messages.concat(newCon.$messages);
		for (i in newCon) {
			// walk properties. if property starts with a $, it's a
			// special property like a counter and shouldn't be merged
			if (i.charAt(0) !== '$' && newCon.hasOwnProperty(i)) {
				oldCon[i] = ErrorContainer.merge(oldCon[i], newCon[i]);
			}
		}
		return oldCon;
	};

	// merge an ErrorContainer instance with a passed instance
	ErrorContainer.prototype.merge = function merge (containers) {
		if (!is.array(containers)) {
			containers = [containers];
		}
		for (var i = 0; i < containers.length; i ++) {
			ErrorContainer.merge(this, containers[i]);
		}
	};

	/* adds a ValidationError or ErrorContainer to an ErrorContainer and
	 * increments the error counts -- if it's just a single ValidationError,
	 * it increments by one, and if it's an ErrorContainer, it increments it by
	 * however many errors are inside that container */
	ErrorContainer.prototype.addError = function addError (error, property, dependency) {
		var i, j;
		// if we got any of these values, that means it's not an error
		if (error === true || error === undefined || error === null) {
			return;
		}
		/* if the 'property' argument has a value, assume error is actually an
		 * errorContainer that's come from a sub-validation, add container to
		 * this[property], aggregate error totals, then finish */
		if (property) {
			error = new ErrorContainer(error);
		}
		if (error instanceof ErrorContainer && error.$counts) {
			if (error.$counts.$total) {
				for (i in error.$counts) {
					if (error.$counts.hasOwnProperty(i)) {
						this.countError(i, error.$counts[i]);
					}
				}
				if (property) {
					if (dependency) {
						/* if the dependency flag is set, then this container
						 * was the result of a dependency check; add it to the
						 * dependencies hash instead of trying to add the
						 * container to this[property] */
						if (this.dendencies === undefined) {
							this.dependencies = {};
						}
						this.dependencies[property] = error;
					} else {
						/* merge tree of errorContainers together; kinda makes a
						 * mish-mash cuz it doesn't tell you whether any given
						 * error comes from oldCon or newCon */
						if (!this[property]) {
							this[property] = new ErrorContainer ();
						}
						this[property].merge(error);
					}
				}
			}
			return;
		}
		// create a ValidationError for generic this: false or message
		if (error === false || typeof error === 'string') {
			error = new ValidationError(undefined, error);
		}
		if (!is.array(error)) {
			error = [error];
		}
		// add the error to the list, tally up the number of errLevels
		for (i = 0; i < error.length; i ++) {
			this.$messages.push(error[i]);
			this.countError(error[i].level, 1);
		}
	};

	/* initialise the errLevels counter if undefined, then add the amount to the
	 * counter. if counter starts with a $, then it's a special counter,
	 * reserved for internal ErrorContainer use. */
	ErrorContainer.prototype.countError = function countError (counter, amt) {
		if (amt && (counter.charAt(0) !== '$')) {
			if (this.$counts[counter] === undefined) {
				this.$counts[counter] = 0;
			}
			this.$counts[counter] += amt;
			this.$counts.$total += amt;
		}
	};

	/*
	 * Here's where the magic happens! validate() takes two arguments:
	 *
	 *   val: any sort of value to be evaluated
	 *
	 *   schema: either a JSON Schema, which is a set of constraints in JSON
	 * 		     format, or
	 * 			 a validator function (more later)
	 *
	 *   More information on the JSON Schema spec can be found at:
	 *
	 *     http://json-schema.org/
	 *
	 *   The spec itself is quite readable, until the point where it starts to
	 *   talk about relationships, sub-schemas, and how to set them up. I felt
	 *   totally lost in some spots, and I realised I just didn't need other
	 *   features, and so as a result the following features are not implemented:
	 *
	 *     extends, id, $ref: TODO: I want to implement this in the future, cuz
	 *     it'd be nice to have sub-schemas, replacement schemas, etc. For now,
	 *     though, I'm leaving it out because it would involve grabbing things
	 *     through HTTP and would have to work in both node and the browser
	 *     (5.26, 27, and 28)
	 *
	 *     $schema: used to validate the current schema; for now, I'm relying on
	 *     developers to make sure their schema conforms to the JSON Schema schema
	 *     (5.29)
	 *
	 *     links, href, rel, targetSchema, method, enctype, schema,
	 *     fragmentResolution, pathStart: used for relationships and REST requests.
	 *     I couldn't figure out a use case for myself, so for now it's not
	 *     implemented :-) Feel free to build on this work if you need this
	 *     functionality. (6.1, 6.1.1.1, 6.1.1.2, 6.1.1.3, 6.1.1.4.1, 6.1.1.4.2,
	 * 	   6.1.1.4.3, 6.2, 6.5)
	 *
	 *     readonly: doesn't make sense for something that's only doing validation
	 *     (6.3)
	 *
	 *     contentEncoding: if we were to validate against mimetypes, we'd be
	 *     getting out of our territory and into something else altogether! It
	 *     would be fairly trivial to write an application/octet-stream validator,
	 *     but imagine having to sniff binary types for images, audio, etc! (6.4)
	 *
	 *     mediaType: Not sure what this one is for (6.6)
	 *
	 * The actual validate() function is nothing but a function that calls the
	 * actual recursive validator function (doValidate), which is not publicly available.
	 * Once doValidate() finishes, validate() checks the contents of the
	 * returned ErrorContainer. If there's no error, it returns true rather
	 * than an ErrorContainer.
	 *
	 * VALIDATOR FUNCTIONS
	 *
	 * This validator diverges from the spec in that it can allow validator
	 * functions to be inserted in a number of different places:
	 *
	 * 		as a validator itself: rather than a JSON schema, the 'schema'
	 * 		argument can simply be a function
	 *
	 * 		as a property of the object being validated: the schema indicates
	 * 		that the object has its own validator function with the
	 * 		'hasValidator' keyword, which points to a property of the object
	 * 		where the validator function resides. Naturally, this only works
	 * 		when the object being validated is actually an object.
	 *
	 * 		as a 'function' property of the schema itself.
	 *
	 * A validator function should take two arguments:
	 *
	 * 		val: the value being currently validated, of course
	 *
	 * 		fullObj: the entire object that was originally passed to the
	 * 		validate() function. This allows the validator function to check
	 * 		other properties to make sure everything is in order.
	 *
	 * Example: given the following object and schema...
	 *
	 *  obj = {
	 *  	province: 'BC',
	 *  	country: 'USA'
	 *  };
	 *  schema = {
	 *  	properties: {
	 *  		province: {},
	 *  		country: {
	 *  			'function': function (val, fullObj) {
	 *  				var provinces = ['BC', 'AB', 'SK', 'MB', 'etc...'];
	 *  				if (!partial
	 * 						&& val !== 'Canada'
	 *  					&& is.inArray(fullObj.province, provinces)) {
	 *  					return 'Gave a Canadian province, but country was given as '+val;
	 *  				}
	 *  			}
	 *  		}
	 *  	}
	 *  };
	 *
	 * the 'country' property fails because its schema includes a function that
	 * checks the country against valid provinces. */

	var validate = exports.validate = (function validate (val, schema) {
		return doValidation(val, schema, val);
	});

	/* this is where it all actually happens. A function which determines the
	 * type of a value, determines whether it matches the type and whether it's
	 * required or not, and farms things out to various other functions. */
	function doValidation (val, schema, fullObj) {
		var i,
			errors = new ErrorContainer(),
			type,
			disallowedType = false,
			allowedTypes,
			tempType,
			funcResult;

		/* if it's undefined, there's really no point in doing the rest. Return
		 * early with an error. */
		if (val === undefined) {
			if (schema.required) {
				errors.addError(new ValidationError(schema.errLevel, 'Required value is undefined', schema.title));
			}
			return errors;
		}

		/* you can pass in a function rather than a JSON schema, and it'll work
		 * just fine. This function should follow the convention of validator
		 * functions described above -- takes val and fullObj as arguments,
		 * and returns:
		 *
		 * 		on success: true, null, or undefined
		 * 		on failure: false, an ErrorObject, ValidationError, or message
		 * 					string
		 */
		if (is.function(schema)) {
			return new ErrorContainer(schema(val, fullObj));
		}

		// determine the type of the object, with special cases for integers
		type = typeof val;
		switch (type) {
			case 'number':
				if (is.integer(val)) {
					type = 'integer';
				}
				break;
			case 'object':
				if (val === null) {
					type = 'null';
					break;
				}
				if (is.array(val)) {
					type = 'array';
					break;
				}
				break;
			default: // strings and booleans should work fine
				break;
		} // end switch(type)

		/* if the schema tells us the object has its own validator, then
		 * start out by validating that object by its own validator... then
		 * apply all the rest of the checks. Totally non-spec; see the above
		 * section on validator functions for more info on how this function
		 * should operate. */
		if (schema.hasValidator !== undefined && is.function(val[schema.hasValidator])) {
			errors = new ErrorContainer(val[schema.hasValidator](val, fullObj));
		}

		// check the allowed types; default is 'any' (5.1)
		disallowedType = false;
		if (schema.type) {
			if (schema.type === 'any') {
				allowedTypes = ['string', 'array', 'object', 'integer', 'number', 'null', 'boolean'];
			} else {
				allowedTypes = (typeof schema.type === 'string') ? [schema.type] : schema.type;
			}
			tempType = type === 'integer' ? 'number' : type;
			if (!is.in(tempType, allowedTypes) && !is.in(type, allowedTypes)) {
				disallowedType = true;
				errors.addError(new ValidationError(schema.errLevel, 'Object is not one of the allowed types', schema.title));
			}

		}

		// check for disallowed types; default is empty (5.25)
		// the spec doesn't define what should happen in the case of a conflict
		// between type and disallowed, so I'm just gonna assume that it checks
		// for allowed types first and then for disallowed types second. In
		// addition, the spec says that the format of this definition is the same,
		// but that doesn't make sense for 'any'.
		if (schema.disallowed && schema.disallowed !== 'any') {
			tempType = type === 'integer' ? 'number' : type;
			disallowedTypes = (is.array(schema.disallowed) ? schema.disallowed : [schema.disallowed]);
			if (is.in(tempType, disallowedTypes) || is.in(type, disallowedTypes)) {
				disallowedType = true;
				errors.addError(new ValidationError(schema.errLevel, 'Object is one of the disallowed types', schema.title));
			}
		}

		// if this type is allowed, then we will waste time on constraint checking
		// -- we want to save cycles, so if the type isn't allowed it won't bother
		if (!disallowedType) {
			switch (type) {

				case 'string':
					errors.merge(validateString(val, schema));
					break;

				case 'array':
					/* arrays need access to the full object, in case any of the
					 * child values or schemas have validator functions */
					errors.merge(validateArray(val, schema, fullObj));
					break;

				case 'object':
					/* same with objects */
					errors.merge(validateObject(val, schema, fullObj));
					break;

				case 'integer':
					// fall through to number
				case 'number':
					errors.merge(validateNumber(val, schema));
					break;
			} // end switch (type)
		} // end if (!disallowedType)

		// Hereafter lie the type-agnostic checks!

		// enum - check against a list of allowed values (5.19)
		if (schema['enum'] && (schema['enum'].indexOf(val) === -1)) {
			errors.addError(new ValidationError(schema.errLevel, 'Value is not in allowable enum values', schema.title));
		}

		/* function - a totally non-spec thing that I added myself, to allow me
		 * to pass custom validators. See above on validator functions to find
		 * out how this function should work.
		 */
		if (is.function(schema['function'])) {
			funcResult = schema['function'](val, fullObj);
			if (funcResult === false) {
				errors.addError(new ValidationError(schema.errLevel, 'Function failed', schema.title));
			} else if (funcResult instanceof ValidationError) {
				errors.addError(funcResult);
			} else if (funcResult instanceof ErrorContainer) {
				errors.merge(funcResult);
			} else if (typeof funcResult === 'string') {
				errors.addError(new ValidationError(null, funcResult, schema.title));
			}
		}
		return errors;
	};


	/* 'String' type
	 * Relevant schema definitions:
	 *
	 *   minLength and maxLength: just what they sound like (5.17 and 5.18)
	 *
	 *   pattern: a string literal of a RegExp (minus /.../ delimiters and
	 *   flags) (5.16)
	 *
	 *   format: a string specifying a certain format - not implemented yet
	 */
	function validateString (val, schema) {
		var errors = new ErrorContainer(),
			pattern;

		if (schema.minLength && val.length < schema.minLength) {
			errors.addError(new ValidationError(schema.errLevel, 'String is too small', schema.title));
		}
		if (schema.maxLength && val.length > schema.maxLength) {
			errors.addError(new ValidationError(schema.errLevel, 'String is too large', schema.title));
		}
		if (schema.pattern) {
			pattern = typeof schema.pattern === 'string'
				? new RegExp(schema.pattern)
				: schema.pattern;
			if (!pattern.test(val)) {
				errors.addError(new ValidationError(schema.errLevel, 'String does not match pattern', schema.title));
			}
		}
		return errors;
	}

	/* 'Array' type
	 * Relevant schema definitions
	 *
	 *   minItems and maxItems: just what they sound like (5.13 and 5.14)
	 *
	 *   items: either a schema against which all values must validate, or
	 *   an array of schemas, in which case the array is treated as a
	 *   finite-length list of tuples and must validate 1:1 against each
	 *   of the schemas, in order (e.g., val[0] validates against
	 * 	 schema.items[0], val[1] against schema.items[1], etc) (5.5)
	 *
	 *   additionalItems: only valid when items is an array of schemas.
	 *   Either false (no additional items allowed), or a schema (5.6)
	 *
	 *   uniqueItems: default false. true if there are any duplicates in
	 *   the array, using strict type checking (5.15)
	 */
	function validateArray (val, schema, fullObj) {
		var i,
			errors = new ErrorContainer(),
			additionalStart = 0,
			itemSchema,
			key,
			uniqueItems = [];

		if (schema.minItems && val.length < schema.minItems) {
			errors.addError(new ValidationError(schema.errLevel, 'Array has too few items', schema.title));
		}
		if (schema.maxItems && val.length > schema.maxItems) {
			errors.addError(new ValidationError(schema.errLevel, 'Array has too many items', schema.title));
		}
		if (schema.items) {
			for (i = 0; i < val.length; i++) {
				if (is.array(schema.items)) {
					if (i >= schema.items.length) {
						// if items is a tuple list, fail once it gets past the
						// number of specified tuples
						additionalStart = i;
						continue;
					}
					itemSchema = schema.items[i];
				} else {
					itemSchema = schema.items;
				}
				// adds the error as an Error Container to a numeric property j,
				// corresponding to the item's index
				errors.addError(doValidation(val[i], itemSchema, fullObj), i);
			}
			if (additionalStart) {
				if (schema.additionalItems) {
					// start where we left off (additionalStart) and continue with
					// the schema defined by additionalItems
					for (i = additionalStart; i < val.length; i++) {
						errors.addError(doValidation(val[i], schema.additionalItems, fullObj), i);
					}
				} else {
					errors.addError(new ValidationError(schema.errLevel, 'Array cannot have additional items', schema.title));
				}
			}
		}
		if (schema.uniqueItems) {
			for (i = 0; i < val.length; i++) {
				key = val[i];
				if (typeof key !== 'number' && key !== null && key !== undefined && typeof key !== 'boolean') {
					key = JSON.stringify(key);
				}
				if (is.inArray(key, uniqueItems)) {
					errors.addError(new ValidationError(schema.errLevel, 'This array item is a duplicate', schema.title), i);
				} else {
					uniqueItems.push(key);
				}
			}
		}
		return errors;
	}; // end function validateArray

	/* 'Object' type
	 *
	 * Relevant schema definitions:
	 *
	 *   properties: a hashtable of allowed properties and schemas (5.2)
	 *
	 *   patternProperties: a hashtable of patterns that allowed property
	 *   names must match against, and their schemas (5.3)
	 *
	 *   addtionalProperties: either false (no allowed additional
	 * 	 properties) or a schema against which all leftover properties
	 *   must validate
	 */
	function validateObject (val, schema, fullObj) {
		var i, prop,
			errors = new ErrorContainer(),
			instance,
			matchInstance = false,
			allowedProperties = [],
			pattern,
			valProp;

		if (schema.instance) {
			/* diverges from the spec; allows you to check against a bunch of
			 * parents to assert a certain prototype chain. Note: If the Object
			 * object is one of the allowed parents, it'll always succeed. */
			instance = is.array(schema.instance) ? schema.instance : [schema.instance];
			for (var i = 0; i < instance.length; i ++) {
				if (val instanceof instance[i]) {
					matchInstance = true;
				}
			}
			if (!matchInstance) {
				errors.addError(new ValidationError(schema.errLevel, 'Object is not one of the allowed instance types', schema.title));
			}
		} // endif (schema.instance)

		if (schema.properties) {
			for (prop in schema.properties) {
				allowedProperties.push(prop);
				// NOTE: will go through val's prototype chain;
				// make sure this is what you want!
				if (schema.properties.hasOwnProperty(prop)) {
					// don't worry; addError will not add an error if there is none
					errors.addError(doValidation(val[prop], schema.properties[prop], fullObj), prop);
				}
			} // end for (prop in schema.properties)
		} // endif (schema.properties)

		if (schema.patternProperties) {
			for (prop in schema.patternProperties) {
				pattern = new RegExp(prop);
				for (valProp in val) {
					if (pattern.test(valProp)) {
						allowedProperties.push(valProp);
						// NOTE: will go through val's prototype chain; make sure
						// this is what you want! don't worry; addError will not add
						// an error if there is none
						errors.addError(doValidation(val[valProp], schema.patternProperties[prop], fullObj), prop);
					}
				} // end for (valProp in val)
			} // end for (prop in schema.patternProperties)
		} // endif (schema.patternProperties)

		// if property is not allowed by either properties or
		// additionalProperties, check to see if we're allowed to have
		// additional properties; otherwise, give an error. Default is
		// an empty schema which validates everything
		if (schema.additionalProperties !== undefined) {
			for (prop in val) {
				if (!is.inArray(prop, allowedProperties)) {
					if (!schema.additionalProperties) {
						errors.addError(new ValidationError(schema.errLevel, 'Property '+prop+' is not allowed', schema.title), prop);
					} else {
						errors.addError(doValidation(val[prop], schema.additionalProperties, fullObj), prop);
					}
				} // endif (!propertyAllowed)
			} // end for (prop in val)
		} // endif (schema.additionalProperties !== undefined)
		return errors;
	}; // end function validateObject

	/* 'integer' and 'number' types
	 * (Note: integer is also number, of course, but must not be a float)
	 * Relevant schema definitions:
	 *
	 *   minimum and maximum: just what they sound like (5.9 and 5.10)
	 *
	 *   exclusiveMinimum and exclusiveMaximum: default false. If true,
	 *   the minimum and maxium values must not equal the value being
	 *   validated. E.g., when exclusiveMinimum = true and minimum = 3,
	 *   3.015 validates but 3 doesn't. (5.11 and 5.12)
	 *
	 *   divisibleBy: a number to divide the value by. If there's a
	 *   remainder, the validation fails. (5.24)
	 */
	function validateNumber (val, schema) {
		var errors = new ErrorContainer();

		if (schema.minimum) {
			if (schema.exclusiveMinimum && val <= schema.minimum) {
				errors.addError(new ValidationError(schema.errLevel, 'Number is too small', schema.title));
			} else if (val < schema.minimum) {
				errors.addError(new ValidationError(schema.errLevel, schema.message || 'Number is too small', schema.title));
			}
		}
		if (schema.maximum) {
			if (schema.exclusiveMaximum && val >= schema.maximum) {
				errors.addError(new ValidationError(schema.errLevel, 'Number is too large', schema.title));
			} else if (val > schema.maximum) {
				errors.addError(new ValidationError(schema.errLevel, schema.message || 'Number is too large', schema.title));
			}
		}
		if (schema.divisibleBy && val % schema.divisibleBy) {
			errors.addError(new ValidationError(schema.errLevel, 'Number is not divisible by '+schema.divisibleBy, schema.title));
		}
		return errors;
	}; // end function validateNumber

})(typeof(window) === 'undefined' ? module.exports : (window.json = window.json || {}));
