/*
	lib/mail/index.js
	Usage: see https://www.npmjs.com/package/postageapp
*/

const PostageApp = require('postageapp')

class Mail {
	constructor ( options ) {
		this.options = options;
		this.templates = options.templates || [];
		this.postageapp;
		if (this.options.POSTAGEPPP_API_KEY) {
			this.postageapp = new PostageApp('ACCOUNT_API_KEY');
		} else {
			this.postageapp = new PostageApp();
		}
	}
	send ( options, next ) {
		this.postageapp.sendMessage(options).then((response) => {
  			next(null,response);
		}).catch( ( error ) => {
			next ( error );
		});
	}

	getInfo ( next ) {
		this.postageapp.accountInfo().the((response) =>{
			next ( null, response );
		}).catch( ( error ) => {
			next ( error );
		});
	}

	getStatus ( msguid, next ) {
		this.postageapp.messageStatus( {uid:msguid} ).then((status) => {
  			next ( null, status );
		}).catch( ( error ) => {
			next ( error )
		});
	}
	
}

module.exports = Mail;