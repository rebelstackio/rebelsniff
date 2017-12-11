/*
	server.js
	Server entry point	
*/

require('dotenv').config();
require('app-module-path').addPath(__dirname);

const path = require('path');
const express = require('express');
const methodOR = require('method-override');
const nunjucks = require ('nunjucks'); // TODO: should we use doT ?
const compression = require('compression');
const RESPOND = require('lib/respond');
const ERROR = require('lib/error');
global.Mail = require('lib/mail');

global.app = express();

// some globals
/* TODO: evaluate if we should really use globals for anything beyond class
 *	definitions - should instances be placed on global or passed as paramters?
 */

global.ERROR = require('lib/error');
const logger = require('lib/logger');
global.LOGGER = new logger( process.env.NODE_ENV );
global.UTIL = require('lib/util');
global.RX = require('lib/rxvalidator');
global.Model = require('lib/model');

const Auth = require('lib/auth');


const Influx = require('influx');
global.INFLUX = new Influx.InfluxDB({
	host: 'localhost',
	database: 'fingerprintdb',
	schema: [{
    	measurement: 'fingerprints',
		fields: {
			print: Influx.FieldType.STRING,
			url: Influx.FieldType.STRING,
			duration: Influx.FieldType.INTEGER
     	},
     tags: [ 'domain','country','city','ip' ]
   }]
});





app.enable('trust proxy');

//app.disable('etag');
app.disable('x-powered-by');
app.use( compression( { threshold: 256 } ) ); // gzip deflate compression over http

// simple clients (GET/POST) can make REST calls (put/patch/delete/head/options)
app.use( methodOR('X-HTTP-Method-Override') );

// FIXME: replace body-parser (crap) with my own parser
let bodyParser = require('body-parser');
app.use( bodyParser.json({strict:false}) );
app.use( bodyParser.urlencoded ( { extended:true } ) );

// NOTE: work-around for stupid body-parser
let _parseSyntaxError = function _parseSyntaxError ( error, req, res, next ) {
	switch ( true ) {
		case ( error instanceof SyntaxError ):
			{
				let errObj =  new ERROR.BadRequestError( "JSON parse error:" + error.message );
				RESPOND.InvalidRequest(res, req, errObj);
				return;
			}
		default: throw error;
	}
	next();
};

// this is a Express SyntaxError which is stepping in our way when, for example, submitted JSON syntax is incorrect
app.use ( _parseSyntaxError );

// TRUST_PROXY
let tp = process.env.TRUST_PROXY || false;
if ( !( tp === false || tp == 'false' || tp == '0' ) ) {
	app.enable('trust proxy');
}

app.set('strict routing', true);

app.set('case sensitive routing', true);

// STATIC_DIR
let staticDir = process.env.STATIC_DIR || null;
if ( staticDir ) {
	staticDir = path.resolve( __dirname, staticDir );
	let staticRUrl = process.env.STATIC_RURL || "/static";
	app.use( staticRUrl, express.static( staticDir ) );
	LOGGER.info ("Static directory: " + staticDir + " exposed at: " + staticRUrl );
}

// JWT
if ( process.env.JWT_SECRET ) {
	global.AUTH = new Auth ( process.env.JWT_SECRET, { logger:global.LOGGER } );
} else {
	throw new Error("JWT_SECRET env var not set.")
}

//Register routes
require('./routers')( app, AUTH );
app.set('port', ( process.env.PORT || 8888 ));
app.listen( app.get('port'), function() {
	LOGGER.info(`Node app is running on port ${ app.get('port') }`);
});
