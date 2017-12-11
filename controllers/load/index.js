/* controllers/load/index.js */

const RESPOND = require('lib/respond');
const ERROR = require( 'lib/error' );
const ECODES = ERROR.codes;
const logmodel = require('models/logmodel')(INFLUX);
const maxmind = require('maxmind');

module.exports.load = function load( req, res ) {
	const path = req.path;
	const print = req.headers["X-Sniff-print"];
	const url = req.query["url"];
	let lookupopts = { cache:{max:100000,maxAge:1000*604800}, watchForUpdates:true };
	let lookup = maxmind.openSync( 'GeoLite2-City.mmdb', lookupopts );
	let location = lookup.get(req.ip);
	logmodel.load( location, function ( error, data ) {
		if ( error ) {
			return RESPOND.respondDBError ( res, req, error );
		} else {
			return RESPOND.Success( res, req );
		}
	});
};
