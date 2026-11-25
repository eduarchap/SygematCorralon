#include "(CurrentProject)/Documentos/General/sjcl.js"

importClass("VFile");
importClass("VTextFile");

function readCredentialsFromDisk(file, auth_var, refresh_var) {
	
	// No hacer nada si la variable global ya tiene contenido
	if (theApp.globalVarToString(auth_var) !== "") { return; }

	var to = theApp.clientCachePath();
				
	if ( theApp.sysInfo().getOs() < 200 ) {		   
		to = to.match(/\\$/) ? to : ( to + "\\");
	} else {
		to = to.match(/\/$/) ? to : ( to + "/" );
	}
		
	var path = to + file,
		file = new VTextFile( path ),
		access = ""; 

	if ( file.exists() ) {
		if ( file.open( VFile.OpenModeReadOnly ) ) { access = file.readAll(); } else { access = ""; }
	} else {
		access = "";
	}

	if ( access != "" ) {
		var credentials = sjcl.decrypt("mtjhShZd", access).split("####");
		
		theApp.setGlobalVar(auth_var, credentials[0]);
		theApp.setGlobalVar(refresh_var, credentials[1]);
	}

}

readCredentialsFromDisk("access.json", "sygemat_corralon_dat/DOC_G_DRI_AUT_TOK", "sygemat_corralon_dat/DOC_G_DRI_AUT_REF_TOK");
readCredentialsFromDisk("uKc6eHyN.json", "sygemat_corralon_dat/DOC_GOO_AUT_TOK", "sygemat_corralon_dat/DOC_GOO_AUT_REF_TOK");