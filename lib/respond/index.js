/*
	lib/respond/index.js
	Application specifc http response handling
*/

const ERROR = require('lib/error');
const logger = require('lib/logger');
const LOGGER = global.Logger || new logger(process.env.NODE_ENV);
const DBERRORS = require('lib/db/errcodes');

const buildPassthroughObj = function buildPassthroughObj ( body, params ) {
	let passthrough = {};
	if ( typeof body == 'object') {
		for ( let bodykey in body ) {
			if ( body.hasOwnProperty(bodykey) ) {
				passthrough[bodykey] = body[bodykey];
			}
		}
	}
	if ( typeof params == 'object') {
		for ( let prmskey in params ) {
			if ( params.hasOwnProperty(prmskey) ) {
				passthrough[prmskey] = params[prmskey];
			}
		}
	}
	return passthrough;
};

const buildResponseObj = function buildResponseObj ( passthrough, type, code, dataObj, stripNull, audit ) {
	let _removeNulls = function _removeNulls ( obj ) {
		if ( obj instanceof Array ) {
			for ( let j in obj ) {
				return _removeNulls( obj[j] );
			}
		}
		for ( let k in obj ) {
			if ( obj[k]===null ) {
				delete obj[k];
			} else if ( typeof obj[k]=="object" ) {
				_removeNulls( obj[k] );
			}
		}
	};

	let resObj = {};
	if ( passthrough ) {
		for ( let key in passthrough ) {
			if ( key.indexOf('#') === 0 ) {
				resObj[key] = passthrough[key];
			}
		}
	}
	if ( stripNull ) {
		_removeNulls(dataObj);
	}
	if ( dataObj ) resObj.data = dataObj;
	if ( type ) resObj.type = type;
	if ( code ) resObj.code = code;
	if ( audit && typeof audit == 'object' ) {
		for ( let k in audit ) {
			if ( audit.hasOwnProperty(k) && ( k != 'type' || k != 'data' ) )
			resObj[k] = audit[k];
		}
	}
	if ( Object.keys( resObj ).length > 0 ) return resObj;
	else return void 0;
}

const wrapSuccessDataObj = function wrapSuccessDataObj ( dataObj, type, stripNulls ) {
	if (typeof type == 'boolean') {
		stripNulls = type;
		type = undefined;
	}
	let dataObjWrapper = {};
	dataObjWrapper.type = type;
	dataObjWrapper.data = dataObj;
	dataObjWrapper.stripNulls = stripNulls;
	return dataObjWrapper;
}

const respondDBError = function ( response, request, dberr ) {
	let error = new ERROR.DataBaseError( dberr );
	let statusCode = 500;
	let resJSON;
	LOGGER.error( error );
	response.set( 'X-Error-Code', DBERRORS(dberr.code) );
	if ( resJSON ) {
		response.set('Content-Type', 'application/json');
		return response.status(statusCode).send(JSON.stringify(resJSON));
	} else {
		return response.status(statusCode).send();
	}
}

const respondInvalidRequest = function respondInvalidRequest ( response, request, errObject ) {
	let responseData = {};
	responseData.message = "Invalid Request Error";
	let type = "Request_Invalid_Error";
	let statusCode = 400;
	let code = null;
	// NOTE: overrides supplied by errObject
	if ( errObject ) {
		type = errObject.constructor.name;
		code = errObject.code || null;
		responseData.message = errObject.message ? errObject.message : responseData.message;
		if (errObject.value) {
			responseData.value = errObject.value;
		}
		if ( errObject.origValue ) {
			const errors = errObject.origValue;
			//JSON SCHEMAS ERRORS
			if ( Array.isArray(errors)) {
				responseData.errors = {};
				errors.forEach(function(element) {
					const path = element.dataPath.replace('.','');
					if ( !responseData.errors[path] ){
						responseData.errors[path] = [];
					} 
					responseData.errors[path].push(element.message);
				});
			}
		}
		statusCode = errObject.httpstatus ? errObject.httpstatus : statusCode;
	}
	let resJSON = buildResponseObj( request, type, code, responseData, false );
	response.set('Content-Type', 'application/json');
	if ( code ) response.set( 'X-Error-Code', code.toString() );
	return response.status(statusCode).send(JSON.stringify(resJSON));
}

const respondUnavailableRetry = function respondUnavailableRetry ( response, request, errObject ) {
	let statusCode = 503;
	let responseData = {};
	responseData.message = "Service temporarily unavailable. Please retry";
	let type = "Service_Unavailable_Please_Retry";
	let code = null;
	let ra = 1;
	if ( errObject ) {
		type = errObject.constructor.name;
		code = errObject.code || null;
		ra = errObject.retryafter || ra;
		responseData.message = errObject.message?errObject.message:responseData.message;
		statusCode = errObject.httpstatus?errObject.httpstatus:statusCode;
	}

	response.set('Retry-After', ra);
	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		let resJSON = buildResponseObj( request, type, code, responseData, false );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}
}

const respondNotAuthorized = function respondNotAuthorized ( response, request, errObject ) {
	let statusCode = 401;
	let responseData = {};
	responseData.message = "Authorisation error";
	let type = "Request_Authorisation_Error";
	let code = null;
	if ( errObject ) {
		type = errObject.constructor.name;
		code = errObject.code || null;
		responseData.message = errObject.message?errObject.message:responseData.message;
		statusCode = errObject.httpstatus?errObject.httpstatus:statusCode;
	}

	response.set('WWW-Authenticate', 'Bearer token_type="JWT"');
	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		response.set('Content-Type', 'application/json');
		let resJSON = buildResponseObj( request, type, code, responseData, false );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}

}

const respondForbidden = function respondForbidden ( response, request, errObject ) {
	let statusCode = 403;
	let responseData = {};
	responseData.message = "Forbidden";
	let type = "Request_Authorisation_Error";
	let code = null;
	if ( errObject ) {
		type = errObject.constructor.name;
		code = errObject.code || null;
		responseData.message = errObject.message?errObject.message:responseData.message;
		statusCode = errObject.httpstatus?errObject.httpstatus:statusCode;
	}
	//response.set('WWW-Authenticate', 'application/x-www-form-urlencoded');
	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		response.set('Content-Type', 'application/json');
		let resJSON = buildResponseObj( request, type, code, responseData, false );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}
}

const respondNotFound = function respondNotFound ( response, request, errObject ) {
	let statusCode = 404;
	let responseData = {};
	responseData.message = "Resource not found";
	let type = "error";
	let code = null;
	if ( errObject ) {
		type = errObject.constructor.name;
		code = errObject.code || null;
		responseData.message = errObject.message?errObject.message:responseData.message;
		statusCode = errObject.httpstatus?errObject.httpstatus:statusCode;
	}
	//response.set('WWW-Authenticate', 'application/x-www-form-urlencoded');
	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		response.set('Content-Type', 'application/json');
		let resJSON = buildResponseObj( request, type, code, responseData, false );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}
}

const respondServerError = function respondServerError ( response, request, errObj ) {
	let statusCode = 500;
	let responseData = {};
	let code = null;
	if ( errObj ) {
		statusCode = errObj.httpstatus?errObj.httpstatus:statusCode;
		code = errObj.code || null;
	}
	
	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		responseData.message = "Unexpected Error";
		let type = "error";
		let passthrough = buildPassthroughObj( request.body, request.params );
		let resJSON = this.buildResponseObj( passthrough, type, code, responseData, false );
		response.set( 'Content-Type', 'application/json' );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}
}

const respondNotImplemented = function respondNotImplemented ( response, request, errObj ) {
	let statusCode = 501;
	let responseData = {};
	let code = null;
	let type = "error";
	let passthrough = buildPassthroughObj( request.body, request.params );
	if ( errorObj ) {
		statusCode = errObj.httpstatus?errObj.httpstatus:statusCode;
		code = errObj.code || null;
	}
	responseData.message = "Not Implemented;";

	if ( code ){
		response.set( 'X-Error-Code', code.toString() );
		return response.status( statusCode ).send();
	} else{
		response.set( 'Content-Type', 'application/json' );
		let resJSON = this.buildResponseObj( passthrough, type, code, responseData, false );
		return response.status( statusCode ).send( JSON.stringify( resJSON ) );
	}
}

const respondSuccess = function respondSuccess ( response, request, wrappedData, altStatus, code, audit ) {
	let statusCode = altStatus || 200;
	code = code || null;
	if ( wrappedData ) {
		let responseData = wrappedData.data ? wrappedData.data : {};
		let responseType = wrappedData.type ? wrappedData.type : "success";
		statusCode = wrappedData.httpstatus ? wrappedData.httpstatus : statusCode;
		let stripNulls = wrappedData.stripNulls;
		let resJSON = buildResponseObj( request, responseType, code, responseData, stripNulls, audit );
		response.set( 'Content-Type', 'application/json' );
		response.status( statusCode ).send( JSON.stringify( resJSON ) );
		return resJSON;
	} else {
		if ( request && request.body ) {
			let respObj = buildResponseObj( request.body );
			if ( respObj ) return response.status( statusCode ).send( JSON.stringify( respObj ) );
			else return response.status( statusCode ).send();
		} else return response.status( statusCode ).send();
	}
}

const respondTemplate = function respondTemplate ( response, request, html, altStatus ) {
	let statusCode = altStatus || 200;
	return response.status( statusCode ).send( html );
}

const respondRedirect = function respondRedirect ( response, headers, statusCode, noWrapDataStr ) {
	statusCode = statusCode || 307;
	if ( noWrapDataStr && ( typeof noWrapDataStr != 'string' ) ) {
		// TODO : handle this error condition
	}
	if ( headers ) {
		if ( typeof headers == 'object' ) {
			for ( let key in headers ) {
				response.set( key, headers[key] );
			}
		} else {
			// TODO : handle this error condition
		}
	}
	if ( noWrapDataStr ) return response.status( statusCode ).send( noWrapDataStr );
	else {
		return response.status( statusCode ).send();
	}
}

exports.wrapper = wrapSuccessDataObj;
exports.ServerError = respondServerError;
exports.InvalidRequest = respondInvalidRequest;
exports.UnavailableRetry = respondUnavailableRetry;
exports.NotAuthorized = respondNotAuthorized;
exports.Forbidden = respondForbidden;
exports.NotFound = respondNotFound;
exports.ServerError = respondServerError;
exports.NotImplemented = respondNotImplemented;
exports.Success = respondSuccess;
exports.Template = respondTemplate;
exports.Redirect = respondRedirect;
exports.respondDBError = respondDBError;