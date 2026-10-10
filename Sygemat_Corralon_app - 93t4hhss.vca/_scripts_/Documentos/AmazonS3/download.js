#include "(CurrentProject)/Documentos/Amazons3.js"

var download_folder = theRoot.varToBool("RUT_DES");
var currentPath = theRoot.varToString("RUT");
var fileName = theRoot.varToString("FIC_NOM");
var to = theRoot.varToString("TO");

if ( download_folder ) {
		
	getBucketContent(currentPath, function(entries, bucket) {
		entriesToQueue( entries, to, bucket, currentPath);
	});
} else {
	
	DownloadToFile( currentPath, fileName, to );
}
