/*
	lib/auth/index.js
	authorization (not authentication)	
*/

const JWT = require('jwt-simple');

const ERROR = require('lib/error');

const RESPOND = require('lib/respond');

const Privileges = require('lib/auth/privileges');

const Pako = require('pako');

const Auth = function Auth ( secret, options, rolesmodel ) {
	console.debug = console.log;
	console.fatal = console.error;
	this.Logger = console;
	this.allowAnonymous = false;

	this.rmodel = rolesmodel;

	if ( options ) {
		switch ( true ) {
			case Boolean( options.logger ) :
				this.Logger = options.logger;
				break;
			case Boolean( options.allowAnonymous ) :
				this.allowAnonymous = true;
				break;
			default : break;
		}
	}

	let _JWT_SECRET = secret || false;
	if ( !_JWT_SECRET ) {
		let error = new ERROR.ServerError( null, "JWT_SECRET not supplied." );
		this.Logger.error( error );
		throw error;
	}

	this.decode = function ( jwt ) {
		return this.decodeJWT( jwt, _JWT_SECRET );
	};

	this.encode = function ( jwt ) {
		return this.encodeJWT( jwt, _JWT_SECRET );
	};

	this.generatePrivilegeChecker = function ( privileges ) {
		return function ( req, res, next ) {
			let dtoken, token;
			token = this.parseAuthHeaders ( req.headers );
			try {
				if ( !token ) {
					if ( !this.allowAnonymous ) {
						let error = new ERROR.AuthError(
							'JWT Authorization is required',
							ERROR.codes.JWT_CREDS_REQUIRED
						);
						return RESPOND.NotAuthorized( res, req, error );
					} else {
						const print = req.headers["X-Sniff-print"];
						if ( !print ) {
							let error = new ERROR.AuthError(
								'X-Sniff-print or Authorization header required',
								ERROR.codes.NO_CREDENTIALS
							);
							return RESPOND.NotAuthorized( res, req, error );
						} else {
							let f = pako.deflate( print, {to:'string'} );
							const ttl = new Date( Date.now() + parseInt( process.env.JWT_TTL ) );
							const dtoken = { exp:ttl, p:0, f:f };
							const jwt = AUTH.encode( dtoken );
							const parts = req.hostname.split('.');
							const len = parts.length;
							let domain='';
							if ( len === 1 ){
								domain = parts[0];
							} else {
								domain = req.hostname;
							}
							const cookieOptions = {
								"domain": domain,
								"secure": req.protocol === "https",
								"sameSite": "strict",
								"expires": ttl
							};
							res.cookie( 'jwt', jwt, cookieOptions );
							req.dtoken = dtoken;
							return next();
						}
					}
				} else {
					try {
						dtoken = this.decodeJWT( token, _JWT_SECRET );
					} catch ( e ) {
						const err = this.decodeErr(e);
						switch ( true ) {
							case ( err instanceof ERROR.AuthError ):
								return RESPOND.NotAuthorized( res, req, err );
							default:
								return RESPOND.ServerError( res, req, err);
						}
					}
					if ( !privileges || privileges == 0 ) {
						req.dtoken = dtoken;
						return next();
					}
					const uprivs = dtoken.p;
					if ( !uprivs ) {
						const err = new ERROR.AuthError( 'JWT payload is corrupt', ERROR.codes.JWT_PAYLOAD_CORRUPT );
						return RESPOND.NotAuthorized( res, req, err );
					}
					if ( this.hasCorrectPrivileges( uprivs, privileges ) ) {
						req.dtoken = dtoken;
						return next();
					} else {
						let err = new ERROR.AuthError( 'Forbidden resource', ERROR.codes.FORBIDDEN );
						return RESPOND.Forbidden( res, req, err );
					}	
				}
			} catch ( e ) {
				return RESPOND.NotAuthorized( res, req, e );
			}
		}.bind( this )
	}.bind( this );
};

Auth.prototype.Privileges = Privileges;

Auth.prototype.maskPrivs = function ( privsgrid ) {
	let len = 0;
	let result = [];
	for ( let x = 0; x < privsgrid.length; x++) {
		if ( privsgrid[x].length > len ) {
			len = privsgrid[x].length
		}
	}
	for ( let y = 0; y < len; y++ ) {
		for ( let z = 0; z < privsgrid.length; z++ ) {
			result[y] = result[y] | privsgrid[z][y];
		}
	}
	return result;
};

Auth.prototype.decodeErr = function ( error ) {
	switch ( error.message ) {
		case "Algorithm not supported":
			return new ERROR.AuthError('JWT algorithm not supported',ERROR.codes.JWT_UNSUPPORTED_ALGORITHM);
		case "Token not yet active":
			return new ERROR.AuthError('Token not yet active',ERROR.codes.JWT_TOKEN_NOT_ACTIVE);
		case "Token expired":
			return new ERROR.AuthError('Token expired',ERROR.codes.JWT_TOKEN_EXPIRED);
		case "Signature verification failed":
			return new ERROR.AuthError('Signature verification failed',ERROR.codes.JWT_SIG_VERIFY_FAILED);
		default:
			return new ERROR.ServerError(error, error.message, ERROR.codes.SERVER_ERROR);
	}
};

Auth.prototype.decodeJWT = function ( jwt, secret ) {
	return JWT.decode( jwt, secret );
};

Auth.prototype.encodeJWT = function ( payload, secret ) {
	return JWT.encode( payload, secret );
};

Auth.prototype.hasCorrectPrivileges = function ( uprivileges, privileges ) {
	const len = privileges.length;
	
	if ( uprivileges.length === len ){
		
		for ( let i = 0; i < len; i++){
			let filtered = ( uprivileges[i] & privileges[i] );
			if ( filtered ^ privileges[i] ){ //If not 0 a privilege is missing
				return false;
			}
		}
		
		return true;

	} else {
		throw new ERROR.AuthError(
			'Incorrect number of privilage sets',
			ERROR.codes.JWT_CREDS_BAD_SCHEME
		);
	}
};

Auth.prototype.parseAuthHeader = function ( authorization ) {
	if ( authorization ) {
		let parts = authorization.split(' ');
		if (parts.length == 2) {
			let scheme = parts[0];
			let credentials = parts[1];
			if (/^Bearer$/i.test(scheme)) {
				return credentials;
			} else {
				throw new ERROR.AuthError(
					'Format is Authorization: Bearer [token]',
					ERROR.codes.JWT_CREDS_BAD_SCHEME
				);
			}
		} else {
			throw new ERROR.AuthError(
				'Format is Authorization: Bearer [token]',
				ERROR.codes.JWT_CREDS_BAD_FORMAT
			);
		}
	} else {
		throw new ERROR.AuthError(
			'JWT Authorization is required',
			ERROR.codes.JWT_CREDS_REQUIRED
		);
	}
}

Auth.prototype.parseAuthHeaders = function ( headers ) {
	if ( headers && headers.authorization ) {
		return this.parseAuthHeader( headers.authorization );
	} else {
		return null;
	}
}

module.exports = Auth;
