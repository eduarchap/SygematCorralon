importClass("VFile");
importClass("VTextFile");
importClass("VRegisterList");

// Abrir el archivo JSON y leer su contenido
var textoArchivo = new VTextFile(theRoot.varToString("SND"));
textoArchivo.setCodec("UTF-8");
if (!textoArchivo.open(VFile.OpenModeReadOnly)) {
    alert("No se pudo abrir el archivo JSON.");
}
var contenidoJSON = textoArchivo.readAll();
textoArchivo.close();

// Parsear el contenido JSON
var registrosFinales = JSON.parse(contenidoJSON);


// Iniciar una transacción si es necesario
var hayTrans = theRoot.existTrans();
if (hayTrans == false) {
    var newTrans = theRoot.beginTrans("Insertando datos desde JSON");
}
theRoot.initProgressBar();

var resultado = "";
//Vaciamos todas las tablas primero
for (var x = 0; x < registrosFinales.length; x++) {
    var registro = registrosFinales[x];
    var idTabla = registro.tabla;

	//alert(JSON.stringify(jsonLimpio));
	//TENER CUIDADO
		theApp.emptyTable(idTabla);

		
}

/*for (var i = 0; i < registrosFinales.length; i++) {
    var registro = registrosFinales[i];
    var idTabla = registro.tabla;
	var indice = registro.indice
	
	var jsonLimpio = JSON.parse(registro.json_data);
	alert(JSON.stringify(jsonLimpio));
	var operacion = theRoot.registerFromJSON(JSON.stringify(jsonLimpio), VRoot.ImportTypeCreateModify, idTabla, indice);
	var bOkAlta = operacion.ok;
	var erroresalta = operacion.errors;

	//Mostrar error si no se ha podido llevar a cabo la generación de registros
	if (!bOkAlta)
	{
		var tablasMal  = tablasMal + "Tabla: " + idTabla + "\n" 
	}


	

    theRoot.setProgress((i + 1) * 100 / registrosFinales.length);

	
}*/


// Recorrer el array de registros
for (var i = 0; i < registrosFinales.length; i++) {
    var registro = registrosFinales[i];
    var idTabla = registro.tabla;
	if(registro.json_data !== "[]"){
		var datosTabla = JSON.parse(registro.json_data); // Aquí tenemos los datos JSON
		var indice = registro.indice;


		// Obtener la tabla en Velneo
		var registro = new VRegister(theRoot);
		registro.setTable(idTabla);
		
		let registroOK = 0;
		let registroKO = 0;
		theRoot.setTitle("Importando " + idTabla.split("/")[1]);
		if(datosTabla.length > 0){
			for(var j = 0; j < datosTabla.length; j++){
				var operacion = registro.fromJSON( JSON.stringify(datosTabla[j]) );
				if( operacion.ok ){
					registroOK += 1;
					registro.addRegister();			
				}else{
					registroKO += 1;			
				}
			}
		
			//resultado += "\n" + idTabla + " OK=" + registroOK + " ERROR=" + registroKO ;
			
			// Actualizar el progreso
			//theRoot.setProgress((i + 1) * 100 / registrosFinales.length);
		}
	}
}

// Finalizar transacción si es necesario
if (newTrans) {
    theRoot.commitTrans();
}

theRoot.endProgressBar();
alert("Termino");
