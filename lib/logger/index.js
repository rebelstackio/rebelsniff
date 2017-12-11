/*
	lib/logger/index.js
	Logger library
*/

const os = require('os');

let _defaultLogger = null;

class Logger {

	constructor ( mode, flushable ) {
		let quiet = process.env.NODE_QUIET || false;
		if (!( quiet === false || quiet == 'false' || quiet == '0' )) {
			this.quiet = true;
		} else this.quiet = false;
		this.flushable = flushable || false;
		this.logq = {};
		mode = mode || process.env.NODE_ENV || "development";
		this._modes = {"development":0,"testing":1,"staging":2,"production":3};
		if ( typeof this._modes[mode] == 'undefined' ) throw new Error("not a valid mode");
		else this.mode = mode;
		this._severityArr = ["DEBUG","INFO","WARN","ERROR","FATAL"];
		this._severity = {"DEBUG":0,"INFO":1,"WARN":2,"ERROR":3,"FATAL":4};
		this._spacing = {"development":2,"testing":2,"staging":null,"production":null};
	}

	static getDefaultLogger (mode) {
		if ( !_defaultLogger ) {
			_defaultLogger = new Logger(mode);
		}
		return _defaultLogger;
	}

	_e ( logfuncname, message ) {
		switch(logfuncname) {
			case "log": console.log(message); break;
			case "info": console.info(message); break;
			case "warn": console.warn(message); break;
			case "error": console.error(message); break;
			default: throw new Error(`console does not support function:$logfuncname`);
		}
	}

	_emit ( logfuncname, message ) {
		if ( flushable ) {
			if ( !this.logq[logfuncname] instanceof Array ) {
				this.logq[logfuncname] = [];
			}
			this.logq[logfuncname].push(message); 
		} else {
			_e( logfuncname, message );
		}
	}

	_flush ( next ) {
		for ( let k in Object.keys(this.logq) ) {
			for ( let m in this.logq[k] ) {
				_e( k, m )
			}
		}
	}

	_emitLogEntry ( severity, error ) {
		if (this.quiet) return false;
		//var p = os.platform(); var t = os.type(); var a = os.arch();
		if ( !this._severityArr[severity] ) throw new Error("not a valid severity");
		else {
			if ( severity===0 && this._modes[this.mode] > 1 ) return false;
			else {
				let h = os.hostname(), r = os.release(), u = os.uptime(), l = os.loadavg();
				let timestamp = new Date().toISOString();
				let message = "";
				let spacing = this._spacing[this.mode];
				switch ( true ) {
					case ( error instanceof Error ):
						message = { message:error.message, stack:error.stack };
						if ( error["metrigon:context"] ) {
							message.context = error["metrigon:context"];
						}
						break; // TODO: prepend exact type of error (constructor name)
					case ( typeof error == 'string' ):
						message = error;
						break;
					case ( typeof error == 'object' ):
						message = error;
						break;
					default: message = error.toString(); break;
				}
				let s = this._severity;
				let logjson;
				switch ( severity ) {
					case s.DEBUG:
						logjson = JSON.stringify({
							timestamp:timestamp, type:"DEBUG", message:message, error:error
						},null,spacing);
						return console.log  ( logjson );
					case s.INFO:
						logjson = JSON.stringify({
							timestamp:timestamp, type:"INFO", message:message
						},null, spacing);
						return console.info ( logjson );
					case s.WARN:
						logjson = JSON.stringify({
							timestamp:timestamp, type:"WARN", message:message,
							h:h, r:r, u:u, l:l
						},null,spacing);
						return console.warn ( logjson );
					case s.ERROR:
						logjson = JSON.stringify({
							timestamp:timestamp, type:"ERROR", message:message, error:error,
							h:h, r:r, u:u, l:l
						},null,spacing);
						return console.error( logjson );
					case s.FATAL:
						logjson = JSON.stringify({
							timestamp:timestamp, type:"FATAL", message:message, error:error,
							h:h, r:r, u:u, l:l
						},null,spacing);
						return console.error( logjson );
					default: return false;
				}
			}
		}
	};

	flush ( next ) {
		if (this.flushable) {
			return this._flush(next);
		} else return next(false);
	}

	debug ( msgErr ) { return this._emitLogEntry( 0, msgErr ); }

	info ( msgErr ) { return this._emitLogEntry( 1, msgErr ); }

	warn ( msgErr ) { return this._emitLogEntry( 2, msgErr ); }

	error ( msgErr ) { return this._emitLogEntry( 3, msgErr ); }

	fatal ( msgErr ) { return this._emitLogEntry( 4, msgErr ) };
}

module.exports = Logger;
