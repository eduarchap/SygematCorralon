importClass( "VFile" );

var contenidoCompreso = "";
var senda = theRoot.varToString("SND");
var fi = new VFile( senda );

//Abrimos el fichero
if( fi.open( VFile.OpenModeReadOnly ) ){
	//Leemos el contenido
	var contenido = fi.readAll();
	//Cerramos el fichero
	fi.close();
	// Comprimimos y llevamos a base64
	contenidoCompreso = contenido.compress(6).toBase64().toLatin1String();
	
	theRoot.setVar("OK", 1);
	theRoot.setVar("RES", contenidoCompreso );
}else{
	theRoot.setVar("OK", 0);
	theRoot.setVar("RES","No se pudo leer el fichero de entrada");
}