#include "(CurrentProject)/Documentos/Dropbox.js"

var from 	   = theRoot.varToString("FRO"),
	uploadPath = theRoot.varToString("SUB_PAT");

fileUpload( from, uploadPath, function(data) {
		theRoot.setVar("DRO_PAT", data.path_lower);
});