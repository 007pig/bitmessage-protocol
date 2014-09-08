var util = require("util");
var stream = require('stream');
var SmartBuffer = require('smart-buffer');
var debug = require('debug')('protocol');

util.inherits(BMProtocol, stream.Duplex);

function BMProtocol() {
	if (!(this instanceof BMProtocol)) return new BMProtocol();
	stream.Duplex.call(this);

	this._buffer = [];
	this._bufferSize = 0;
}

BMProtocol.prototype._write = function(data, encoding, callback) {
	this._bufferSize += data.length;
	this._buffer.push(data);

	var headerparsed = false,
		command, payloadlength, checksum;
	// Try to get header from data
	while (this._bufferSize >= 24) {
		var buffer = (this._buffer.length === 1)
			? this._buffer[0]
			: Buffer.concat(this._buffer);

		var reader = new SmartBuffer(buffer);

		// Try to find magic
		var check = reader.readUInt32BE();
		if (check != 0xE9BEB4D9) {
			this._bufferSize -= 4;
		}
		else {
			debug('Magic found. Parsing header...');

			// parse header
			command = reader.readString(12);
			payloadlength = reader.readUInt32BE();
			checksum = reader.readUInt32BE();

			debug('Command: %s, payloadLength: %s, checksum: %s', command, payloadlength, checksum);

			if (payloadlength > 20000000) {
				debug('The incoming message, which we have not yet download, is too large. Ignoring it. (unfortunately there is no way to tell the other node to stop sending it except to disconnect.) Message size: %s', payloadlength);
				callback('payload length too big');
			}

			headerparsed = true;

		}
	}

	callback();

};

BMProtocol.prototype._read = function() {

};