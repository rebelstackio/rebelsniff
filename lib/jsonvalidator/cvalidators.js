module.exports = {
	"STRINT": function strint(property, value, schema, path, parentData) {
		strint.errors = [];
		const patn = new RegExp(/^\+?(0|[1-9]\d*)$/);
		if ( patn.test( value ) ) {
			return true;
		} else {
			strint.errors.push({
				keyword: "invalid integer",
				message: "Invalid integer value"
			});
			return false;
		}
	},
	"STRARR": function rhexarrv(property, value, schema, path, parentData) {
		rhexarrv.errors = [];
		const patn = new RegExp('[[\s\S]*?]');
		if ( patn.test( value ) ) {
			try {
				const uid = JSON.parse(value);
				return true;
			} catch ( err ){
				rhexarrv.errors.push({
					keyword: "parsingtojson",
					message: "Cannot be parsed to JSON"
				});
				return false;
			}
		} else {
			rhexarrv.errors.push({
				keyword: "invalidarray",
				message: "Invalid array"
			});
			return false;
		}
	},
	//FIXME: SHOULD ADD A RKEY VALIDATION BESIDE ARRAY 
	"RHEXARR": function rhexarrv(property, value, schema, path, parentData) {
		rhexarrv.errors = [];
		const patn = new RegExp('[[\s\S]*?]');
		if ( patn.test( value ) ) {
			try {
				const uid = JSON.parse(value);
				return true;
			} catch ( err ){
				rhexarrv.errors.push({
					keyword: "parsingtojson",
					message: "Cannot be parsed to JSON"
				});
				return false;
			}
		} else {
			rhexarrv.errors.push({
				keyword: "invalidarray",
				message: "Invalid routable key array"
			});
			return false;
		}
	},
	"RHEXARRORRHEX": function rhexarrorrhexv(property, value, schema, path, parentData) {
		rhexarrorrhexv.errors = [];
		const patn = new RegExp('[[\s\S]*?]');
		if ( patn.test( value )  ) {
			try {
				const uid = JSON.parse(value);
				return true;
			} catch ( err ){
				rhexarrorrhexv.errors.push({
					keyword: "parsingtojson",
					message: "Cannot be parsed to JSON"
				});
				return false;
			}
		} else {
			return true;
		}
	},
}