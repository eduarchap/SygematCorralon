importClass("VFile");
importClass("VTextFile");


// Clase que permite trabajar con propiedades
// Guarda las propiedades en un fichero en formato JSON
// Asume como directorio el cacheclient
// Asume como nombre de fichero el id del proyecto principal seguido de ".properties"

function Properties() {
	// Asignamos el nombre del fichero a usar
	this.filename = theRoot.clientCachePath() + theApp.mainProjectInfo().id()+".properties";
	// Creamos sólo una vez el handle del fichero
	this.file = new VTextFile(this.filename);
}

// Devuelve el valor de la propiedad indicada en el parámetro
Properties.prototype.get = function (property, defaultValue) {
	var jsObject = {};
	// Se abre el fichero en modo lectura
	if ( this.file.open(VFile.OpenModeReadOnly) ) {
		try {
			jsObject = JSON.parse(this.file.readAll());	
		} catch (err) {
			// El fichero está vacío y por eso el parse da error
		}
		// Cerramos el fichero
		this.file.close();
	}
	var result = jsObject[property];
	// Retornamos el defaultValue si la propiedad solicitada no está definida
	result = result !== undefined ? result : defaultValue;
	return result;
}

Properties.prototype.set = function (property, value) {
	// Se abre el fichero en modo lectura/escritura
	if ( this.file.open(VFile.OpenModeReadWrite) ) {
		var jsObject = {};
		try {
			jsObject = JSON.parse(this.file.readAll());	
		} catch (err) {
			// El fichero está vacío y por eso el parse da error
		}
		this.file.close();
	}
	// Guardamos el fichero de nuevo
	if ( this.file.open(VFile.OpenModeWriteOnly | VFile.OpenModeTruncate) ) {
		// Asignamos el valor de la propiedad
		jsObject[property]=value;
		// Guardamos el fichero. Antes convertimos el JSON a string
		this.file.write(JSON.stringify(jsObject));
		// Cerramos el fichero
		this.file.close();
		return value;
	}
}

if (properties === undefined)
	var properties = new Properties();