#include "(CurrentProject)/Documentos/GoogleDrive.js"

var from_path = theRoot.varToString("FRO_PAR_ID"),
	to_path   = theRoot.varToString("TO_PAR_ID"),
	fileId    = theRoot.varToString("FIC_ID");

move(from_path, to_path, fileId);