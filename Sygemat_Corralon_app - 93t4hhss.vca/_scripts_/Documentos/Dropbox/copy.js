#include "(CurrentProject)/Documentos/Dropbox.js"

var from_path = theRoot.varToString("FRO_PAT"),
	to_path   = theRoot.varToString("TO_PAT"),
	copy_mode = theRoot.varToBool("COP");

move(from_path, to_path, copy_mode);