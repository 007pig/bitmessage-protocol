var util = require("util");
var stream = require('stream');

util.inherits(BMProtocol, stream.Duplex)

function BMProtocol() {
	if (!(this instanceof BMProtocol)) return new BMProtocol();
	stream.Duplex.call(this);


}

