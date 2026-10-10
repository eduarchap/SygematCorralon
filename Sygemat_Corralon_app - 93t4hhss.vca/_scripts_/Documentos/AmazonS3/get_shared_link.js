#include "(CurrentProject)/Documentos/Amazons3.js"

var path = theRoot.varToString("RUT"),
	expiration = theRoot.varToInt("EXP");

theRoot.setVar("LNK", buildSignedUrl(path, expiration));