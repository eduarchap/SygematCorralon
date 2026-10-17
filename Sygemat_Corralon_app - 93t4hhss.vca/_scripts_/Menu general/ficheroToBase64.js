importClass("VFile");

var sendaFichero = theRoot.varToString("SND_FIC");

if( theApp.existsFile( sendaFichero ) == true){
	var contenido = new VByteArray();
	var fp = new VFile( sendaFichero );		
	if ( fp.open( VFile.OpenModeReadOnly ) ){
		contenido = fp.readAll();
	}
	fp.close();
	theRoot.setVar("OK", true );
	theRoot.setVar("BAS_64" , contenido.toBase64().toLatin1String());	
}else{
	theRoot.setVar("OK", false );
	theRoot.setVar("BAS_64" , "Ocurrio un error durante el proceso");	
}