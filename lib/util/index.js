/*
	lib/util/index.js
	Utilities
*/

exports.toPGErrCode = function ( errfloat ) {
	return (parseFloat(errfloat)*100).toString();
};

exports.dash2rkey = function dash2rkey ( rkeyhex ) {
	let rkeya = rkeyhex.split(":");
	return `('${ rkeya[0] }','${ rkeya[1] }',${ parseInt(rkeya[2],16) })`;
};

exports.encrpassgrp = function encrpassgrp ( hash, salt, encr, iter  ) {
	if ( hash.hash ) {
//		return `('${ hash.hash }','${ hash.salt }',${ hash.encr },${ hash.iter })`;
		return `(${ hash.hash },${ hash.salt },${ hash.encr },${ hash.iter })`;
	} else {
//		return `('${ hash }','${ salt }',${ encr }, ${ iter })`;
		return `(${ hash },${ salt },${ encr }, ${ iter })`;
	}
};

exports.toBitwiseArray = function toBitwiseArray ( intmask ) {
	let bwarr = [];
	for ( let x = 31; x >= 0; x--) {
		if ( ( intmask >> x ) & 1 !== 0 ) {
			bwarr.push( Math.pow( 2, x ) );
		}
	}
	return bwarr.reverse();
}

exports.getJSON = function getJSON ( parsedUrl, next ) {
	const url = require('url');
	const http = require('https');
	const strUrl = url.format(parsedUrl);
	http.get(strUrl, function (res) {
		let strData = '';
		res.on('data', function (chunk) {
			strData += chunk;
		});
		res.on('error', function (error) {
			return next(error, strData);
		});
		res.on('end', function () {
			try {
				return next(null,JSON.parse(strData));
			} catch (e) {
				return next(e,"Could not parse JSON from server response.");
			}
		});
	});
};

exports.prepareresult = function _prepareresult(result) {
	if ( result ) {
		if ( result.rows && result.rows[0]) {
			const res =  result.rows[0];
			const keys = Object.keys(res);
			if ( keys && keys.length ) {
				return res[keys[0]];
			}
		}
	}
	return null;
}

exports.tointarr = function _tointarr(intarr) {
	// FIXME: BETTER VALIDATION
	try {
		const result = JSON.parse(intarr);
		return result;
	} catch (error) {
		throw new Error('Invalid value, it cannot be casting to int array');
	}
}

exports.torhexarr = function _torhexarr(rhexarr) {
	try {
		const result = JSON.parse(rhexarr);
		return result;
	} catch (error) {
		throw new Error('Invalid value, it cannot be casting to rhexarr');
	}
}

exports.torhexarrorhex = function _torhexarrorhex(rhex) {
	try {
		const result = JSON.parse(rhex);
		return result;
	} catch (error) {
		if ( typeof rhex === 'string' ) {
			return rhex;
		} else {
			return rhex + '';
		}
	}
}


const toIEEE754 = function toIEEE754(v, ebits, fbits) {
	const bias = (1 << (ebits - 1)) - 1;
	let e, f, s;
	if (isNaN(v)) {
		e = (1 << bias) - 1; f = 1; s = 0;
	} else if (v === Infinity || v === -Infinity) {
		e = (1 << bias) - 1; f = 0; s = (v < 0) ? 1 : 0;
	} else if (v === 0) {
		e = 0; f = 0; s = (1 / v === -Infinity) ? 1 : 0;
	} else {
		s = v < 0;
		v = Math.abs( v );
		if ( v >= Math.pow( 2, 1 - bias ) ) {
			let ln = Math.min(Math.floor(Math.log(v) / Math.LN2), bias);
			e = ln + bias;
			f = v * Math.pow(2, fbits - ln) - Math.pow(2, fbits);
		} else {
			e = 0;
			f = v / Math.pow(2, 1 - bias - fbits);
		}
	}
	let i, bits = [];
	for (i = fbits; i; i -= 1) { bits.push(f % 2 ? 1 : 0); f = Math.floor(f / 2); }
	for (i = ebits; i; i -= 1) { bits.push(e % 2 ? 1 : 0); e = Math.floor(e / 2); }
	bits.push( s ? 1 : 0 );
	bits.reverse();
	let str = bits.join('');
	let bytes = [];
	while (str.length) {
		bytes.push(parseInt(str.substring(0, 8), 2));
		str = str.substring(8);
	}
	return bytes;
}

const fromIEEE754 = function fromIEEE754( bytes, ebits, fbits ) {
	let bits = [];
	for (let i = bytes.length; i; i -= 1) {
		let byte = bytes[i - 1];
		for (let j = 8; j; j -= 1) {
			bits.push(byte % 2 ? 1 : 0); byte = byte >> 1;
		}
	}
	bits.reverse();
	let str = bits.join('');
	let bias = (1 << (ebits - 1)) - 1;
	let s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
	let e = parseInt(str.substring(1, 1 + ebits), 2);
	let f = parseInt(str.substring(1 + ebits), 2);
	if (e === (1 << ebits) - 1) {
		return f !== 0 ? NaN : s * Infinity;
	} else if (e > 0) {
		return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
	} else if (f !== 0) {
		return s * Math.pow(2, -(bias-1)) * (f / Math.pow(2, fbits));
	} else {
		return s * 0;
	}
}

const fromIEEE754Double  = function fromIEEE754Double(b) { 
	return fromIEEE754(b, 11, 52);
}
const toIEEE754Double  = function toIEEE754Double(v) { 
	return toIEEE754(v, 11, 52);
}

