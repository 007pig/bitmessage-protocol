var util = require("util");

describe('Buffer', function(){
	it('sha512 hex', function() {
		var buf = new Buffer('test');
		console.log(util.inspect(buf.toString('hex')));
		console.log(require('crypto').createHash('sha512').update(buf).digest().slice(0, 4));
	});
});