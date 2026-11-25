#include "(CurrentProject)/Documentos/Amazons3.js"

var from_path = theRoot.varToString("FRO_PAT"),
	to_path   = theRoot.varToString("TO_PAT"),
	copy_mode = theRoot.varToBool("COP");

copy(from_path, to_path);