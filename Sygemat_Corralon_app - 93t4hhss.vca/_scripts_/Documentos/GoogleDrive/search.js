#include "(CurrentProject)/Documentos/GoogleDrive.js"

var parentId = theRoot.varToString("PAR_ID"),
	term = theRoot.varToString("BUS");

search(parentId, term, function(entries){
		addData(entries);
});