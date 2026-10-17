#include "(CurrentProject)/Importar y exportar/funcionesImpExp.js"

// Preparamos las variables de trabajo
var mapeoCampos         = theRoot.varToString("MAP_CAM");
var objMapeoCampos      = {};
var ficheroComprimido   = theRoot.varToString("FIC");
var separador           = theRoot.varToString("SEP");
var tieneCabeceras      = theRoot.varToBool("TIE_CAB");
var bloqueOptimo        = 1000;
var contenido           = "";
var arrayContenido      = "";
var vbComprimido        = new VByteArray();
var vbComprimidoB64     = new VByteArray();
var registroVacio       = new VRegister(theRoot);
var nuevaTrans          = false;
var hayTrans            = theRoot.existTrans();
var linea               = "";
var arrayLinea          = "";
var contadorOperaciones = 0;
var tablaInfo           = "";
var mapeoTabla          = {};
var idRefTabla          = theRegisterIn.fieldToString("PRY") + "/" + theRegisterIn.fieldToString("ID_REF_TAB");
var forzarNoCrear       = false;

// Inicializamos variables de reporte
theRoot.setVar("REPORTE",         "[]");
theRoot.setVar("REPORTE_CNT_OK",  "0");
theRoot.setVar("REPORTE_CNT_ERR", "0");

// Tomamos el contenido y lo descomprimimos
vbComprimido.setText( ficheroComprimido );
vbComprimidoB64.fromBase64( vbComprimido );
contenido = vbComprimidoB64.uncompress().toUtf8String().replace(/\r/g,"");
arrayContenido = contenido.split("\n");

// Creamos un registro base para tomar el tableInfo
registroVacio.setTable( idRefTabla );
tablaInfo = registroVacio.tableInfo();

// Mapeamos la tabla para obtener los campos importables
mapeoTabla = mapearTabla(tablaInfo, mapeoTabla);
objMapeoCampos = JSON.parse( mapeoCampos );

// Ciclo repetitivo de importacion, agregando +1 si no tiene cabecera
for( var i = ( tieneCabeceras ? 1 : 0) ; i < arrayContenido.length ; i++){
	if ( (hayTrans == false) && (nuevaTrans == false)){
		nuevaTrans = theRoot.beginTrans( "Importando registros bloque " + ( i / bloqueOptimo ) );
	};
	if ( hayTrans || nuevaTrans ){
		// Inicializo la variable de trabajo del registro a importar
		var registroInterno = new VRegister(theRoot);
		registroInterno.setTable( idRefTabla );

		//Tomo la linea del fichero a importar
		linea = arrayContenido[ i ];
		arrayLinea = linea.split( separador );

		for( var j = 0; j < arrayLinea.length; j++){
			// Obtenemos las posibles formas de solucionar el campo a importar
			var posiblesSoluciones = objMapeoCampos[(j+1)];
			if( typeof posiblesSoluciones != "undefined" ){
				// Por cada posible solucion, importamos lo que corresponda a cada una
				for( var k = 0; k < posiblesSoluciones.length; k++){
					if( posiblesSoluciones[k].metodoResolucion == "0" ){ // Si la importacion es directa
						registroInterno.setField( posiblesSoluciones[k].resuelveCon, arrayLinea[j] );
					}else{ // Si el campo a importar es objeto
						theRoot.setVar("VALOR",     arrayLinea[j]);
						theRoot.setVar("RESULTADO", "");

						if( mapeoTabla[ posiblesSoluciones[k].resuelveCon ] != "110" ){
							registroInterno.setField( posiblesSoluciones[k].resuelveCon, eval( posiblesSoluciones[k].script ) || "" );
						}else{
							registroInterno.setFieldImage( posiblesSoluciones[k].resuelveCon, eval( posiblesSoluciones[k].script ) || "" );
						}

						// Si el script seteó RESULTADO, lo agregamos al array REPORTE
						var resultado = theRoot.varToString("RESULTADO");
						if( resultado && resultado.trim() !== "" ){
							var reporteActual = theRoot.varToString("REPORTE");
							if( reporteActual === "[]" ){
								theRoot.setVar("REPORTE", "[" + resultado + "]");
							} else {
								theRoot.setVar("REPORTE", reporteActual.slice(0, -1) + "," + resultado + "]");
							}
							var objRes = JSON.parse( resultado );
							if( objRes.estado === "OK" ){
								var cntOk = theRoot.varToString("REPORTE_CNT_OK");
								theRoot.setVar("REPORTE_CNT_OK", String((cntOk === "" ? 0 : parseInt(cntOk, 10)) + 1));
							} else {
								var cntErr = theRoot.varToString("REPORTE_CNT_ERR");
								theRoot.setVar("REPORTE_CNT_ERR", String((cntErr === "" ? 0 : parseInt(cntErr, 10)) + 1));
							}
						}
					}
				}
			}
		}

		if( registroInterno.exist() ){
			registroInterno.modifyRegister();
		}else{
			if( forzarNoCrear == false ){
				registroInterno.addRegister();
			}
		}
		contadorOperaciones += 1;
	}
	// Finaliza el bloque de la transaccion en el bloqueOptimo para generar una nueva
	if ( ((nuevaTrans == true) || (hayTrans == true)) && ( contadorOperaciones >= bloqueOptimo) ){
		theRoot.commitTrans();
		nuevaTrans = false;
		hayTrans = false;
		contadorOperaciones = 0;
	};
}

// Commit final para los registros restantes que no alcanzaron el bloque optimo
if (nuevaTrans == true) {
	theRoot.commitTrans();
}

// Resumen final
theRoot.setVar("REPORTE_RESUMEN",
	'{"ok":'    + theRoot.varToString("REPORTE_CNT_OK")
	+ ',"err":' + theRoot.varToString("REPORTE_CNT_ERR")
	+ ',"detalle":' + theRoot.varToString("REPORTE")
	+ '}'
);
