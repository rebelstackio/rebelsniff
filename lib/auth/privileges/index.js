/* lib/auth/privileges/index.js */



/*  Usage:
    const priv = require('lib/privileges');
    priv[priv.class.system];
    //{ enabled:p(0),changemypass:p(1),mustresetpasson1st:p(2),…,_classname:"system"}

*/

function p ( x ) {
    return Math.pow(2,x);
}

module.exports = {
    0: {
        enabled:p(0),
        changemypass:p(1),
        mustresetpasson1st:p(2),
        changemyemail:p(3),
        super:p(30),
        suspended:p(31),
        _classname:"system"
        },
    1: {
        enabled:p(0),
        cancreateuser:p(1),
        canpatchuser:p(2),
        cancreateorclonerole:p(3),
        _classname:"userrole"
    },
    2: {
        enabled:p(0),
        _classname:"gm"
    },
    class: {
        system:0,
        userrole:1,
        gm:2
    }
};