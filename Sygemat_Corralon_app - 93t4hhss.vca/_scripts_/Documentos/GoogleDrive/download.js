#include "(CurrentProject)/Documentos/GoogleDrive.js"

var download_folder = theRoot.varToBool("ES_CAR");

if ( download_folder ) {
	getRootFiles(theRoot.varToString("FIC_ID"), function(entries) {
		entriesToQueue( entries, theRoot.varToString("TO") );
	});
} else {
	DownloadToFile( theRoot.varToString("FIC_ID"), theRoot.varToString("TO"), theRoot.varToString("FIC"));
}