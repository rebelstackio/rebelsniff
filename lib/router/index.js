/* lib/router/index.js */
/*
	lib/router/index.js
	Library file for utility functions for building routers
*/

//Borrowed util functions
const hasProp = Object.prototype.hasOwnProperty;

const express = require('express');

const RX = require('lib/rxvalidator');

const LOG = require('lib/logger').getDefaultLogger();

const Router = module.exports = {};

const getOptionsController = function getOptionsController( apiDoc ){
	const RESPOND = require( 'lib/respond' );

	return function( req, res ){
		let wrapper = RESPOND.wrapper( apiDoc, req.path, true );
		RESPOND.Success( res, req, wrapper );
	}
};

const buildOptionsData = function buildOptionsData( rt, jv ){
	
	const optionsData = { "verb": rt.method };
	if ( rt.rxvalid ){
		optionsData.validations = RX.printRXValid( rt.rxvalid );
	}
	if ( rt.privs ){
		optionsData.required_privileges = rt.privs;
	}
	if ( jv ){
		if ( rt.validreq ){
			const bodySchema = jv.ajv.getSchema( rt.validreq );
			if ( bodySchema && bodySchema.schema ){
				optionsData.body_schema = bodySchema.schema;
			}
		}
		if ( rt.validres ){
			const resSchema = jv.ajv.getSchema( rt.validres );
			if ( resSchema && resSchema.schema ){
				optionsData.response = resSchema.schema;
			}
		}
	}

	return optionsData;
	
}

const buildOptionRoute = function buildOptionRoute ( optionsData ) {
	const mws = [];
	const rv = RX.validate;

	mws.push( rv( RX.NOT_ACCEPT_JSON ) );
	mws.push( getOptionsController( optionsData ) );
	
	return mws;

}

Router.buildRouter = function buildRouter ( options, newSchemaVal ) {
	const newSchemaValFlag = newSchemaVal || false;
	const router = express.Router();
	const optionsResponseBody = {};

	let rv = RX.validate;
	let noOfRoutes = options.routes.length;
	for ( let idx = 0; idx < noOfRoutes; idx++ ) {
		let rt = options.routes[idx];
		let mws = [];

		//Authorization for the endpoint
		if ( options.auth ) {

			if ( rt.privs ) {
				let pc = options.auth.generatePrivilegeChecker;
				mws.push( pc( rt.privs ) );
			} else {
				LOG.warn(`No authorisation privileges assigned to path ${ rt.path }`);
			}

		} else if ( rt.privs ) {
			LOG.warn("Auth object not supplied to Router yet route requires it");
			delete rt.privs;
		}

		//Request formation checker for the endpoint
		if ( rt.rxvalid ) {
			mws.push( rv( rt.rxvalid ) );
		}
		if ( options.jsonv && rt.validreq ) {
			let jvq = options.jsonv;
			if ( newSchemaValFlag ) {
				mws.push( jvq.validateMixReq( rt.validreq ) );
			} else {
				mws.push( jvq.validateReq( rt.validreq ) );
			}
		}

		//Other middleware for the endpoint
		if ( rt.mwares ) {
			let noOfMw = rt.mwares.length;
			for ( let i = 0; i < noOfMw; i++ ) {
				let mw = rt.mwares[i];
				if ( typeof mw === 'function' ) {
					mws.push(mw);
				} else {
					throw TypeError( "All middleware instances must be a function" );
				}
			}
		}

		//Build the route for the endpoint and add it to the express router instance
		router[rt.method]( rt.path, mws );

		if ( !hasProp.call( optionsResponseBody, rt.path ) ){
			optionsResponseBody[rt.path] = [];
		}
		optionsResponseBody[rt.path].push( buildOptionsData( rt, options.jsonv ) );

	}

	router.options( '/', buildOptionRoute( optionsResponseBody ) );

	return router;
}
