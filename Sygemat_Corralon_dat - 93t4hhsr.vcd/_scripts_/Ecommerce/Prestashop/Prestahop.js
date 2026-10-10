#include "(CurrentProject)/Ecommerce/ajax.js"

importClass("FormData");

// Subir foto
function subirFoto( url, sendaFichero, usuario, nombreFichero) {
    
	var clave = new VByteArray();
	clave.setText( usuario + ":" );
	
	nombreFichero = nombreFichero.replace(/-/g,"_");
	
	var contenido = new VByteArray();
	var fi = new VFile( sendaFichero );
	if ( fi.open( VFile.OpenModeReadOnly ) ) {
		contenido = fi.readAll();
		fi.close();
	}
	alert("conteido " + contenido.length);
	let boundary = '----boundary' + Math.random().toString(36).substr(2);
	
	let body = '--'+boundary+'\r\n' +
    'Content-Disposition: form-data; name="image"; filename="'+nombreFichero+'"\r\n' +
    'Content-Type: image/'+nombreFichero.split(".")[1]+'\r\n\r\n';
    
	let imageData = contenido.arrayBuffer();
	
	for (let i = 0; i < contenido.length; i++) {
		body += String.fromCharCode(imageData[i]); // solo funciona si son bytes imprimibles		
	}
	body += '\r\n' + '--'+boundary+'--\r\n';
	
	var xhr = new XMLHttpRequest();
	xhr.open('POST', url, false);
	xhr.setRequestHeader('authorization', ("Basic " + clave.toBase64().toLatin1String()));
	xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
	xhr.send(body);
	
	
	alert(xhr.status);
	alert(xhr.response);
	alert(body);
	
}