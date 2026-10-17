Base64 = {
	encode: function(value) {
				var text = new VByteArray();
				text.setText( value );
				var ba64 = text.toBase64();
				return(ba64.toLatin1String());
	},
	decode: function(value) {
				var ba64 = new VByteArray();
				ba64.setText( value );
				var ba4 = new VByteArray();
				ba4.fromBase64(ba64);
				return(ba4.toLatin1String());
	}
};