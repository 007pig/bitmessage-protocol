var util = require("util");
var stream = require('stream');
var SmartBuffer = require('smart-buffer');
var buffertools = require('buffertools');
var bignum = require('bignum');
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

	this._connectionIsOrWasFullyEstablished = false;
}

BMProtocol.prototype._write = function(data, encoding, callback) {
	this._bufferSize += data.length;
	this._buffer.push(data);

	var command = '', payloadlength = 0, checksum = '', buffer, payload;
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
				if (!this._connectionIsOrWasFullyEstablished) {
					if (['version', 'verack'].indexOf(command) != -1) {
						this['_oncmd_' + command](payload);
					}
				}
				else {
					this['_oncmd_' + command](payload);
				}
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

// ######################
// Command processor
// ######################

BMProtocol.prototype._oncmd_version = function(payload) {
	console.log(payload);
};

BMProtocol.prototype._oncmd_verack = function(payload) {
	console.log(payload);
};

// ######################
// Command
// ######################

BMProtocol.prototype.sendVersion = function(remoteHost, remotePort, myStreamNumber) {
	var payload = new SmartBuffer();

	payload.writeInt32BE(3); // version
	payload.writeBuffer(bignum(3).toBuffer({size: 8}));
	payload.writeBuffer(bignum(3).toBuffer({size: 8}));

};

// ######################
// Helper methods
// ######################

BMProtocol.prototype._createPacket = function(command, payload) {
	var payload_length = payload.length, checksum, packet;

	if (payload.length == 0) {
		checksum = new Buffer('CF83E135', 'hex');
	}
	else {
		checksum = require('crypto').createHash('sha512').update(payload).digest().slice(0, 4)
	}

	var commandpad = new Buffer(12 - command.size).fill(0);
	packet = new SmartBuffer();
	packet.writeUInt32BE(0xE9BEB4D9); // magic
	packet.writeString(command); // command
	packet.writeBuffer(commandpad); // command pad
	packet.writeUInt32BE(payload_length); // payload length
	packet.writeBuffer(checksum); // checksum
	packet.writeBuffer(payload); // payload

	return packet.toBuffer();
};

BMProtocol.prototype._sendPacket = function(command, payload) {
	this.push(this._createPacket(command, payload));
};