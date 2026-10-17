// -------------------------------------------------------------------------------------------------
// Procesar las etiquetas del texto para sustituir por el valor de los campos de la tabla
// -------------------------------------------------------------------------------------------------
var tablaIdRef = theRoot.varToString("TAB_ID_REF");
var registroId = theRoot.varToString("ID");
var texto = theRoot.varToString("TXT");
var parametro1 = theRoot.varToString("PAR1");
var parametro2 = theRoot.varToString("PAR2");
var parametro3 = theRoot.varToString("PAR3");
var parametro4 = theRoot.varToString("PAR4");
var parametro5 = theRoot.varToString("PAR5");
var parametro6 = theRoot.varToString("PAR6");
var firma = theRoot.varToString("FIR");

// Se lee el registro de la tabla
var registro = new VRegister(theRoot);
registro.setTable(tablaIdRef);
if (registro)
{
	var clave = [];
	clave.push(registroId);
	registro.readRegister("ID", clave, VRegister.SearchThis);
	if (registro)
	{
		// Procesamos el texto buscando etiquetas <campo>idCampo</campo>
		while (texto.indexOf("&lt;campo&gt;") != -1)
		{
			var posInicial = texto.indexOf("&lt;campo&gt;");
			var posFinal = texto.indexOf("&lt;/campo&gt;");
			var etiqueta = texto.substring(posInicial, posFinal + 14);
			var campo = texto.substring(posInicial + 13, posFinal);
			var dato = registro.fieldToString(campo);
			
			// Sustitución de saltos de línea por etiqueta HTML
			var dato = dato.replace(/\n/g,"<br/>");;
			
			texto = texto.replace(etiqueta, dato);
		};
		
		// Sustituimos la etiqueta de |PARAMETRO(1,2,3,4,5,6)| por el contenido de la variable
		texto = texto.replace("|PARAMETRO1|", parametro1);
		texto = texto.replace("|PARAMETRO2|", parametro2);
		texto = texto.replace("|PARAMETRO3|", parametro3);
		texto = texto.replace("|PARAMETRO4|", parametro4);
		texto = texto.replace("|PARAMETRO5|", parametro5);
		texto = texto.replace("|PARAMETRO6|", parametro6);
		texto = texto.replace("|FIRMA|", firma);

		// Dejamos el texto en la variable del proceso para que sea recuperada
		theRoot.setVar("TXT", texto);
	};
};