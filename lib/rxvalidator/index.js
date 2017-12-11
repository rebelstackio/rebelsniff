/*
	lib/rxvalidator/index.js
	Library for validating request objects
	
*/

const UTIL = require( 'lib/util' );

const ERROR = require( 'lib/error' );

const RESPOND = require( 'lib/respond' );

const rxdef = {
	"NOT_ACCEPT_JSON": {
		type:"BadHeaderError",
		condition:"!request.headers.accept || request.headers.accept.indexOf('application/json')<0",
		message:"Must accept application/json",
		print: { h: "Accept", v: "application/json" },
		value:Math.pow(2,0)
	},
	"NOT_FORM_ENCODED": {
		type:"BadHeaderError",
		condition:"request.headers['content-type'].indexOf('application/x-www-form-urlencoded')<0",
		message:"Content-Type must be: application/x-www-form-urlencoded",
		print: { "h": "Content-Type", "v": "application/x-www-form-urlencoded" },
		value:Math.pow(2,1)
	},
	"NOT_APP_JSON": {
		type:"BadHeaderError",
		condition:"!request.headers['content-type'] || request.headers['content-type'].indexOf('application/json')<0",
		message:"Content-Type must be: application/json",
		print: { "h": "Content-Type", "v": "application/json" },
		value:Math.pow(2,2)
	},
	"ALREADY_LOGGED_IN": {
		type:"AuthError",
		condition:"request.dtoken",
		message:"current session already logged in",
		print: "Must be logged out",
		value:Math.pow(2,3)
	},
	"NOT_LOGGED_IN": {
		type:"AuthError",
		condition:"!request.dtoken",
		message:"user not logged in",
		print: "Must be logged in",
		value:Math.pow(2,4)
	},
	"NOT_FORMENCODED_OR_APPJSON": {
		type:"BadHeaderError",
		condition:"!request.headers['content-type'] || (request.headers['content-type'].indexOf('application/x-www-form-urlencoded')<0 && request.headers['content-type'].indexOf('application/json')<0)",
		message:"Request Content-Type must be: application/x-www-form-urlencoded or application/json",
		print: { "h": "Content-Type", "v" : "[application/json | application/x-www-form-urlencoded]" },
		value:Math.pow(2,5)
	}
};

const buildEnum = function ( obj ) {
	let dict = {};
	for ( let key in obj ){
		if (typeof obj[key].value == 'number') {
			dict[key] = obj[key].value;
		}
	}
	return dict;
}

const rxenum = buildEnum ( rxdef );

const getKey = function getKey ( val ) {
	// search val in rxenum
	for ( let key in rxenum ) {
		if ( rxenum[key] == val ){
			return key;
		}
	}

	return null;
}

const validate = function validate ( rex ) {
	return function ( request, response, next ) {
		// TODO: perform bitwise to turn rx (int) to bitwise array
		let arrRX = UTIL.toBitwiseArray ( rex );
		for ( let rx of arrRX ) {
			let key = getKey(rx);
			let conditionresult = false;
			if ( rxdef[key] && rxdef[key].condition ) {
				conditionresult = eval( rxdef[key].condition );
			}
			if ( conditionresult ) {
				let err = new ERROR[rxdef[key].type] ( rxdef[key].message, rxdef[key].code );
				return RESPOND.InvalidRequest ( response, request, err );
			}
		}
		return next();
	}.bind( this );
}

const printRXValid = function printRXValid( validateMask ){
	const returnJson = {};
	const headers = {};
	const auth = [];

	let arrRX = UTIL.toBitwiseArray ( validateMask );
	for ( let rx of arrRX ) {
		let key = getKey( rx );
		if ( rxdef[key] ) {
			let cond = rxdef[key];
			let p = cond.print;
			switch ( cond.type ) {
				case "BadHeaderError":
					headers[p.h] = p.v;
					break;
				case "AuthError":
					auth.push( p );
					break;
			
				default:
					break;
			}
		}
	}

	if ( Object.keys( headers ).length ){
		returnJson.headers = headers;
	}
	if ( auth.length ){
		returnJson.auth = auth;
	}

	return returnJson;
}

let obj = {};

for( let enm in rxenum ) {
	obj[enm] = rxenum[enm];
}
obj.validate = validate;
obj.printRXValid = printRXValid;

module.exports = obj;
