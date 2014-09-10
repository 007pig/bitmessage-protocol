var util = require("util");
var dns = require("dns");

describe('Buffer', function(){
	it('sha512 hex', function() {
		var buf = new Buffer('test');
		console.log(util.inspect(buf.toString('hex')));
		console.log(require('crypto').createHash('sha512').update(buf).digest().slice(0, 4));
	});

	it('dns', function(done) {
		dns.resolve4('bootstrap8080.bitmessage.org', function (err, addresses) {
			console.log(addresses);
			done();
		});
	});
});