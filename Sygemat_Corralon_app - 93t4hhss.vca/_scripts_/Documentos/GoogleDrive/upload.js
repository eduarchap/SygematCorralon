#include "(CurrentProject)/Documentos/GoogleDrive.js"

var from 	   = theRoot.varToString("FRO"),
	parentId   = theRoot.varToString("PAR_ID");

fileUpload( from, parentId, function(data) {
	theRoot.setVar("RUT_SUB", data.id);
});