var is = require('is-helpers');

(function (exports) {
	var ValidationError,
		ErrorContainer;

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

	function toType (obj) {
		return ({}).toString.call(obj).match(/\s([a-z|A-Z]+)/)[1].toLowerCase();
	}

	var ErrorContainer = exports.ErrorContainer = function ErrorContainer (error) {
		// hey wait! Is this already an error container?
		if (typeof error === 'object' && error.$counts && error.$messages) {
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
		this.$counts[error.level] = 1;
		this.$counts.$total = 1;
		this.$messages.push(error);
	};

	// merge two ErrorContainer instances together recursively, updating error
	// totals for each node as needed
	ErrorContainer.merge = function (oldCon, newCon) {
		var i;
		if (oldCon === undefined) {
			return newCon;
		}
		for (i in newCon.$counts) {
			countError(oldCon, i, newCon.$counts[i]);
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
	}; // end method ErrorContainer.merge

	// merge an ErrorContainer instance with a passed instance
	ErrorContainer.prototype.merge = function (conts) {
		conts = Array.prototype.slice.call(conts, 0);
		for (var i = 0; i < conts.length; i ++) {
			ErrorContainer.merge(this, conts[i]);
		}
	}; // end method Errorcontainer.prototype.merge

	/*
	 * Here's where the magic happens! validate() takes three arguments:
	 *
	 *   obj: any sort of value to be evaluated
	 *
	 *   schema: a JSON Schema, which is a set of constraints in JSON format.
	 *   More information (including the full spec) can be found at:
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
	 *   partial: a flag that determines whether we should fail on 'required'
	 *   errors. useful for checking small chunks of a schema. True means we don't
	 *   create errors for missing required values. Default is false.
	 */
	exports.validate = function (obj, schema, partial) {
		var fullObj = obj,
			stackDepth = 0;
		// recursive function to walk through all the nested validators
		function validate (obj, schema) {
			var i, j, prop, objProp,
				errors = new ErrorContainer(),
				message,
				type,
				disallowedType = false,
				allowedTypes,
				tempType,
				pattern,
				additionalStart = 0,
				itemSchema,
				uniqueItems = [],
				instance,
				matchInstance = false,
				allowedProperties = [],
				funcResult;

			function countError(errors, counter, amt) {
				// initialise the errLevels counter if undefined, then add the
				// amount to the counter
				// if counter starts with a $, then it's a special counter
				if (amt && (counter.charAt(0) !== '$')) {
					if (errors.$counts[counter] === undefined) {
						errors.$counts[counter] = 0;
					}
					errors.$counts[counter] += amt;
					errors.$counts.$total += amt;
				}
			}

			function addError(error, property, dependency) {
				var i, j;

				// if we got any of these values, that means it's not an error
				if (error === true || error === undefined || error === null) {
					return;
				}
				// if the 'property' argument has a value, assume error is actually an
				// errorContainer that's come from a sub-validation, add container to
				// errors[property], aggregate error totals, then finish
				if (property) {
					error = new ErrorContainer(error);
				}
				if (typeof error === 'object' && error.$counts) {
					if (error.$counts.$total) {
						for (i in error.$counts) {
							countError(errors, i, error.$counts[i]);
						}
						if (property) {
							if (dependency) {
								// if the dependency flag is set, then this container was the
								// result of a dependency check; add it to the dependencies
								// has instead of trying to add the container to
								// errors[property]
								if (errors.dendencies === undefined) {
									errors.dependencies = {};
								}
								errors.dependencies[property] = error;
							} else {
								// merge tree of errorContainers together; kinda makes a mish-
								// mash cuz it doesn't tell you whether any given error comes
								// from oldCon or newCon
								if (!errors[property]) {
									errors[property] = new ErrorContainer ();
								}
								errors[property].merge(error);
							}
						}
					}
					return;
				}
				// create a ValidationError for generic errors: false or message
				if (error === false || typeof error === 'string') {
					error = new ValidationError(undefined, error);
				}
				if (!is.array(error)) {
					error = [error];
				}
				// add the error to the list, tally up the number of errLevels
				for (i = 0; i < error.length; i ++) {
					errors.$messages.push(error[i]);
					countError(errors, error[i].level, 1);
				}
			}

			// prepare message for appending to specific failure messages
			message = schema.message ? ', '+schema.message : '';


			// if it's undefined, there's really no point in doing the rest. Return
			// early, with an error if this value is required and the 'partial' flag
			// is not set.
			if (obj === undefined) {
				if (schema.required && !partial) {
					addError(new ValidationError(schema.errLevel, 'Required value is undefined'+message, schema.title));
				}
				return errors;
			}

			// determine the type of the object, with special cases for integers
			type = typeof obj;
			switch (type) {
				case 'number':
					if (is.integer(obj)) {
						type = 'integer';
					}
					break;
				case 'object':
					if (obj === null) {
						type = 'null';
						break;
					}
					if (is.array(obj)) {
						type = 'array';
						break;
					}
					break;
				default: // strings and booleans should work fine
					break;
			} // end switch(type)

			// if the schema tells us the object has its own validator, then start out
			// by validating that object by its own validator... then apply all the
			// rest of the checks. Totally non-spec!
			if (schema.hasValidator && (typeof obj[schema.hasValidator] === 'function')) {
				// note: if the validator returns true, null, or undefined, there is no
				// error. if it returns false, an error container, or a string, then it
				// is an error -- converts the return vale to a ValidationError and
				// records the error in our Error Container
				errors = new ErrorContainer(obj[schema.hasValidator](obj, partial));
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
				if (allowedTypes.indexOf(tempType) === -1 && allowedTypes.indexOf(type) === -1) {
					disallowedType = true;
					addError(new ValidationError(schema.errLevel, 'Object is not one of the allowed types'+message, schema.title));
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
				disallowedTypes = (typeof schema.disallowed === 'string') ? [schema.disallowed] : schema.disallowed;
				if (disallowedTypes.indexOf(tempType) !== -1 || disallowedTypes.indexOf(type) !== -1) {
					disallowedType = true;
					addError(new ValidationError(schema.errLevel, 'Object is one of the disallowed types'+message, schema.title));
				}
			}

			// if this type is allowed, then we will waste time on constraint checking
			// -- we want to save cycles, so if the type isn't allowed it won't bother
			if (!disallowedType) {
				switch (type) {

					/* 'String' type
					 * Relevant schema definitions:
					 *
					 *   minLength and maxLength: just what they sound like (5.17 and 5.18)
					 *
					 *   pattern: a string literal of a RegExp (minus /.../ delimiters and
					 * 	 flags) (5.16)
					 *
					 *   format: a string specifying a certain format (regexes that define
					 * 	 those formats are at the top of this module)
					 */
					case 'string':
						if (schema.minLength && obj.length < schema.minLength) {
							addError(new ValidationError(schema.errLevel, 'String is too small'+message, schema.title));
						}
						if (schema.maxLength && obj.length > schema.maxLength) {
							addError(new ValidationError(schema.errLevel, 'String is too large'+message, schema.title));
						}
						if (schema.pattern) {
							pattern = typeof schema.pattern === 'string'
								? new RegExp(schema.pattern)
								: schema.pattern;
							if (!pattern.test(obj)) {
								addError(new ValidationError(schema.errLevel, 'String does not match pattern'+message, schema.title));
							}
						}
						break;

					/* 'Array' type
					 * Relevant schema definitions
					 *
					 *   minItems and maxItems: just what they sound like (5.13 and 5.14)
					 *
					 *   items: either a schema against which all values must validate, or
					 *   an array of schemas, in which case the array is treated as a
					 *   finite-length list of tuples and must validate 1:1 against each
					 *   of the schemas, in order (e.g., obj[0] validates against
					 * 	 schema.items[0], obj[1] against schema.items[1], etc) (5.5)
					 *
					 *   additionalItems: only valid when items is an array of schemas.
					 *   Either false (no additional items allowed), or a schema (5.6)
					 *
					 *   uniqueItems: default false. true if there are any duplicates in
					 *   the array, using strict type checking (5.15)
					 */
					case 'array':
						if (schema.minItems && obj.length < schema.minItems) {
							addError(new ValidationError(schema.errLevel, 'Array has too few items'+message, schema.title));
						}
						if (schema.maxItems && obj.length > schema.maxItems) {
							addError(new ValidationError(schema.errLevel, 'Array has too many items'+message, schema.title));
						}
						if (schema.items) {
							for (j = 0; j < obj.length; j++) {
								if (is.array(schema.items)) {
									if (j >= schema.items.length) {
										// if items is a tuple list, fail once it gets past the
										// number of specified tuples
										additionalStart = j;
										continue;
									}
									itemSchema = schema.items[j];
								} else {
									itemSchema = schema.items;
								}
								// adds the error as an Error Container to a numeric property j,
								// corresponding to the item's index
								addError(validate(obj[j], itemSchema), j);
							}
							if (additionalStart) {
								if (schema.additionalItems) {
									// start where we left off (additionalStart) and continue with
									// the schema defined by additionalItems
									for (j = additionalStart; j < obj.length; j++) {
										addError(validate(obj[j], schema.additionalItems), j);
									}
								} else {
									addError(new ValidationError(schema.errLevel, 'Array cannot have additional items'+message, schema.title));
								}
							}
						}
						if (schema.uniqueItems) {
							for (j = 0; j < obj.length; j++) {
								key = obj[j];
								if (typeof key !== 'number' && key !== null && key !== undefined && typeof key !== 'boolean') {
									key = JSON.stringify(key);
								}
								if (is.inArray(key, uniqueItems)) {
									addError(new ValidationError(schema.errLevel, 'This array item is a duplicate'+message, schema.title), j);
								} else {
									uniqueItems.push(key);
								}
							}
						}
						break;

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
					case 'object':
						if (schema.instance) {
							// diverges from the spec; allows you to check against a bunch of
							// parents to assert a certain prototype chain. Note: If Object is
							// one of the allowed parents, it'll always succeed.
							instance = is.array(schema.instance) ? schema.instance : [schema.instance];
							for (var j = 0; j < instance.length; j ++) {
								if (obj instanceof instance[j]) {
									matchInstance = true;
								}
							}
							if (!matchInstance) {
								addError(new ValidationError(schema.errLevel, 'Object is not one of the allowed instance types'+message, schema.title));
							}
						} // endif (schema.instance)

						if (schema.properties) {
							for (prop in schema.properties) {
								allowedProperties.push(prop);
								// NOTE: will go through obj's prototype chain;
								// make sure this is what you want!
								if (schema.properties.hasOwnProperty(prop)) {
									// don't worry; addError will not add an error if there is none
									addError(validate(obj[prop], schema.properties[prop]), prop);
								}
							} // end for (var p in schema.properties)
						} // endif (schema.properties)

						if (schema.patternProperties) {
							for (prop in schema.patternProperties) {
								pattern = new RegExp(prop);
								for (objProp in obj) {
									if (pattern.test(objProp)) {
										allowedProperties.push(objProp);
										// NOTE: will go through obj's prototype chain; make sure
										// this is what you want! don't worry; addError will not add
										// an error if there is none
										addError(validate(obj[objProp], schema.patternProperties[prop]), prop);
									}
								} // end for (objProp in obj)
							} // end for (prop in schema.patternProperties)
						} // endif (schema.patternProperties)

						// if property is not allowed by either properties or
						// additionalProperties, check to see if we're allowed to have
						// additional properties; otherwise, give an error. Default is
						// an empty schema which validates everything
						if (schema.additionalProperties !== undefined) {
							for (prop in obj) {
								if (!is.inArray(prop, allowedProperties)) {
									if (!schema.additionalProperties) {
										addError(new ValidationError(schema.errLevel, 'Property '+prop+' is not allowed'+message, schema.title), prop);
									} else {
										addError(validate(obj[prop], schema.additionalProperties), prop);
									}
								} // endif (!propertyAllowed)
							} // end for (var p in obj)
						} // endif (schema.additionalProperties !== undefined)
						break;

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
					case 'integer':
						// fall through to number
					case 'number':
						if (schema.minimum) {
							if (schema.exclusiveMinimum && obj <= schema.minimum) {
								addError(new ValidationError(schema.errLevel, 'Number is too small'+message, schema.title));
							} else if (obj < schema.minimum) {
								addError(new ValidationError(schema.errLevel, schema.message || 'Number is too small'+message, schema.title));
							}
						}
						if (schema.maximum) {
							if (schema.exclusiveMaximum && obj >= schema.maximum) {
								addError(new ValidationError(schema.errLevel, 'Number is too large'+message, schema.title));
							} else if (obj > schema.maximum) {
								addError(new ValidationError(schema.errLevel, schema.message || 'Number is too large'+message, schema.title));
							}
						}
						if (schema.divisibleBy && obj % schema.divisibleBy) {
							addError(new ValidationError(schema.errLevel, 'Number is not divisible by '+schema.divisibleBy+message, schema.title));
						}
						break;
				} // end switch (type)
			} // end if (!disallowedType)

			// Hereafter lie the type-agnostic checks!

			// enum - check against a list of allowed values (5.19)
			if (schema['enum'] && (schema['enum'].indexOf(obj) === -1)) {
				addError(new ValidationError(schema.errLevel, 'Value is not in allowable enum values'+message, schema.title));
			}

			/* function - a totally non-spec thing that I added myself, to allow me to
			 * pass custom validators. A custom validator receives the value being
			 * tested and a reference to the entire object, and returns:
			 *   on success: true, null, or undefined
			 *   on failure: false, a ValidationError object, or an error message
			 */
			if (typeof schema['function'] === 'function') {
				// function should accept the value and a reference to the
				// entire object, then return one of five values:
				//   * on success: true or undefined
				//   * on failure:  false, an error object, or an error message
				funcResult = schema['function'](obj, fullObj);
				if (!funcResult) {
					addError(new ValidationError(schema.errLevel, 'Function failed'+message, schema.title));
				} else if (funcResult instanceof ValidationError) {
					addError(funcResult);
				} else if (typeof funcResult === 'string') {
					addError(new ValidationError(null, funcResult+message, schema.title));
				}
			}
			return errors;
		}
		return validate(obj, schema);
	};

})(typeof(window) === 'undefined' ? module.exports : (window.json = window.json || {}));
