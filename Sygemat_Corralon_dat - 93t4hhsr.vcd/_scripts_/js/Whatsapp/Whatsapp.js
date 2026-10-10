
#include "(CurrentProject)/js/Whatsapp/ajax.js"
importClass("XMLHttpRequest");
importClass( "VFile" );

//Funcion que recibe una senda de un fichero en disco
//En base a su extension, calcula el mimeType correspondiente
function obtenerTipoMime( path ){
	var fi = new VFile( path );
	var extension = fi.info().suffix();
	var registro = new VRegister( theRoot );
	registro.setTable("sygemat_corralon_dat/EML_MIME_EXT_W");
	registro.readRegister("NAME",[extension], VRegister.SearchThis);
	return registro.fieldToString("MIME");
}


function subirAdjunto( sendaAdjunto ){
	var datos = {
		"messaging_product": "whatsapp",		
		"file": {type: "file", path: sendaAdjunto, mime: obtenerTipoMime( sendaAdjunto )}
	  }	 	  
	 var idFicheroSubido = "";
	$.ajax({
			type: 	 "POST",
			url:  	 "https://graph.facebook.com/v15.0/100855602945379/media",
			headers: { "Authorization": ("Bearer " + theApp.constant("sygemat_corralon_dat/TOK_WP") ) 
			},
			data: 	 datos,
			responseType: "json",
			success: function(data, http_status, cabeceras) {
				idFicheroSubido = data.id;				
			},
			error: function(data, http_status, url) {
				idFicheroSubido = ("Status " + http_status + "\nOcurrio un error en la subida\n\n" + data.error.message);			
		  }
	});
	return idFicheroSubido;
}