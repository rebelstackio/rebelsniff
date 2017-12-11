/*
	lib/db/index.js
	Database client setup
*/

const pg = require('pg');
const PGProfiler = require('lib/pg-profiler');
const logger = require('lib/logger');
const Logger = global.Logger || new logger(process.env.NODE_ENV);
const errcodes = require('lib/db/errcodes');

let config = { max:10, idleTimeoutMillis: 10000 };

let pool = new pg.Pool(config);

pool.on('error', function(error, client) {
	Logger.error(error);
})

let _query = function _query ( statement, params, next ) {
	pool.queryT = pool.query;
	if ( process.env.PGPROFILE &&  process.env.PGPROFILE != "false" ) {
		let pgProfiler = new PGProfiler(pool.query, Logger);
		pool.queryT = pgProfiler.profile(pool);
	}
	return pool.queryT( statement, params, next );
};

const _pquery = async function _pquery ( statement, params ) {
	pool.pqueryT = pool.query;
	if ( process.env.PGPROFILE &&  process.env.PGPROFILE != "false" ) {
		let pgProfiler = new PGProfiler(pool.query, Logger);
		pool.pqueryT = pgProfiler.profile(pool);
	}
	return await pool.pqueryT( statement, params );
};

exports.query = _query;

exports.pquery = _pquery;

exports.errcodes = errcodes;
