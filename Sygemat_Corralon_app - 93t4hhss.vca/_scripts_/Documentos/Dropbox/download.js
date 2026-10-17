#include "(CurrentProject)/Documentos/Dropbox.js"

var download_folder = theRoot.varToBool("RUT_DES");

if ( download_folder ) {
	getRootFiles(theRoot.varToString("RUT_FIC"), function(entries) {
		entriesToQueue( entries, theRoot.varToString("TO") );
	});
} else {
	DownloadToFile( theRoot.varToString("RUT_FIC"), theRoot.varToString("TO") );
}