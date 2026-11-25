#include "(CurrentProject)/Documentos/Dropbox.js"

var path = theRoot.varToString("RUT"),
	term = theRoot.varToString("BUS");

search(path, term, function(entries){
		addData(entries);
});