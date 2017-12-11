/*
	lib/jsonvalidator/index.js
	Library script for handling json validation of application data
*/

const AJV = require('ajv');
const ERROR = require('lib/error');
const RESPOND = require('lib/respond');
const CUSTOMVALIDATORS = require('./cvalidators');

class JSONValidator {

	constructor ( options, schemas ) {
		this.options = options || {allErrors: true};
		// this.schemadict = schemadict;
		this.ajv = new AJV( this.options );
		this.addCustomValidators();
		if ( schemas ) {
			this.addSchema( schemas );
		}
	}

	addCustomValidators() {
		const self = this;
		const cvkeys = Object.keys(CUSTOMVALIDATORS);
		cvkeys.forEach(function(key){
			self.ajv.addKeyword(key, {errors: true, validate: CUSTOMVALIDATORS[key]});
		});
	}

	addRouterSchema ( schemas, key ) {
		const self = this;
		let flag = false;
		if (schemas instanceof Array) {
			schemas.forEach(function(schema){
				const id = schema.$id;
				const title = schema.title;
				const bodyschema = schema.body;
				const urlschema = schema.url;
				if ( bodyschema ) {
					bodyschema.$id = id + 'body';
					bodyschema.title = title + ' Body';
					self.ajv.addSchema(bodyschema);
					flag = true;
				}
				if ( urlschema ) {
					urlschema.$id = id + 'url';
					urlschema.title = title + ' Url';
					self.ajv.addSchema(urlschema);
					flag = true;
				}
				if ( !flag ) {
					throw new Error('Router schema must contain at least a body or url schema');
				}
			});
		} else {
			throw new Error('Router schema must to be an array');
		}
	}

	addSchema ( schemas, key ) {
		const self = this;
		if (schemas instanceof Array) {
			this.ajv.addSchema(schemas);
		} else if ( typeof schemas === 'string' ) {
			this.ajv.addSchema( JSON.parse(schemas), key );
		} else if ( typeof schemas === 'object' ) {
			for ( let sc in schemas ) {
				this.ajv.addSchema( schemas[sc], sc );
			}
		}
	}

	validate ( schema, data ) {
		function _ret ( valid, validator ) {
			if ( !valid ) return validator;
			else return valid;
		}
		let v;
		if ( typeof schema === 'string' ) {
			v = this.ajv.getSchema(schema);
		} else if ( typeof schema === 'object' ) {
			v = this.ajv.compile(schema);
		}
		if ( v ) {
			return _ret( v(data), v );
		} else {
			return true;
		}
	}

	validateMixReq( schema ) {
		return function validateReq( req, res, next ) {
			let p = this.validate( schema + 'url' , req.params );
			if ( typeof p === 'boolean' && p ) {
				let v = this.validate( schema + 'body', req.body );
				if ( typeof v === 'boolean' && v ) {
					return next();
				} else {
					let name =  v.schema.$id.replace(new RegExp('body$'), '');
					let msg = `JSON validation errors were found in the body against schema:${ name }`;
					let err = new ERROR.JSONValidationError( msg, v.errors );
					return RESPOND.InvalidRequest( res, req, err );
				}
			} else {
				let name =  p.schema.$id.replace(new RegExp('url$'), '');
				let msg = `JSON validation errors were found in the url against schema:${ name }`;
				let err = new ERROR.JSONValidationError( msg, p.errors );
				return RESPOND.InvalidRequest( res, req, err );
			}

		}.bind( this );
	}

	validateReq( schema ) {
		return function validateReq( req, res, next ) {
			let v = this.validate( schema, req.body );
			if ( typeof v === 'boolean' && v ) {
				return next();
			} else {
				let msg = `JSON validation errors were found against schema:${ v.schema }`;
				let err = new ERROR.JSONValidationError( msg, v.errors );
				return RESPOND.InvalidRequest( res, req, err );
			}
		}.bind( this );
	}

	validateRes( schema ) {
		return function validateRes( req, res, next ) {
			let v = this.validate( schema, res.body );
			if ( typeof v === 'boolean' && v ) {
				return next();
			} else {
				let msg = `JSON validation errors were found against schema:${ v.schema }`;
				let err = new ERROR.JSONValidationError( msg, v.errors );
				return RESPOND.InvalidRequest( res, req, err );
			}
		}.bind( this );
	}


}

module.exports = JSONValidator;
