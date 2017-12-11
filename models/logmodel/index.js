/* models/log/index.js */

const ERROR = require( 'lib/error' );
const ECODES = ERROR.codes;
const UTIL = require('lib/util');

const LogModel = function LogModel( db ){
	this.db = db;
}

LogModel.prototype.load = function _load( props, next ) {
	db.writePoints([
		{
		measurement: 'response_times',
		tags: { host: os.hostname() },
		fields: { duration, path: req.path },
		}
	]).then(() => {
		return next();
	});
};

module.exports = CustomersModel;
