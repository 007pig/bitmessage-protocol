var util = require("util");
var stream = require('stream');
var SmartBuffer = require('smart-buffer');
var buffertools = require('buffertools');
var debug = require('debug')('protocol');

var MESSAGE_HEADER_SIZE = 24;

util.inherits(BMProtocol, stream.Duplex);

function BMProtocol() {
	if (!(this instanceof BMProtocol)) return new BMProtocol();
	stream.Duplex.call(this);

	this._buffer = [];
	this._bufferSize = 0;

	this._parserSize = MESSAGE_HEADER_SIZE;

	this._headerparsed = false;
}

BMProtocol.prototype._write = function(data, encoding, callback) {
	this._bufferSize += data.length;
	this._buffer.push(data);

	var command, payloadlength = 0, checksum = '', buffer, payload;
	// Try to get header from data
	while (this._bufferSize >= this._parserSize) {
		buffer = (this._buffer.length === 1)
			? this._buffer[0]
			: Buffer.concat(this._buffer);

		var reader = new SmartBuffer(buffer);

		if (!this._headerparsed) {
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
				checksum = reader.readBuffer(4);

				debug('Command: %s, payloadLength: %s, checksum: %s', command, payloadlength, checksum);

				// Remove header data from _buffer
				this._buffer = this._bufferSize
					? [buffer.slice(this._parserSize)]
					: [];
				this._bufferSize -= this._parserSize;

				this._headerparsed = true;
				this._parserSize = payloadlength;
			}
		}
		else {
			payload = buffer.slice(0, this._parserSize);

			// Validate checksum
			if (payloadlength > 20000000) {
				debug('The incoming message, which we have not yet download, is too large. Ignoring it. Message size: %s', payloadlength);
			}
			else if (!buffertools.equals(require('crypto').createHash('sha512').update(payload).digest().slice(0, 4), checksum)) {
				debug('Bad checksum. Expected: %s, Actual: %s', checksum, require('crypto').createHash('sha512').update(payload).digest().slice(0, 4));
			}
			else {

			}

			// Remove payload data from _buffer
			this._buffer = this._bufferSize
				? [buffer.slice(this._parserSize)]
				: [];
			this._bufferSize -= this._parserSize;

			// Ready for next header
			this._headerparsed = false;
			this._parserSize = MESSAGE_HEADER_SIZE;

		}


	}

	callback();

};

BMProtocol.prototype._read = function() {

};

BMProtocol.prototype._parse = function(command, payload) {

};