// -------------------------------------------------------------------------------------------------
// Procesar las etiquetas del texto para sustituir por el valor de los campos de la tabla
// -------------------------------------------------------------------------------------------------
var tablaIdRef = theRoot.varToString("TAB_ID_REF");
var registroId = theRoot.varToString("ID");
var texto = theRoot.varToString("TXT");

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
		while (texto.indexOf("<campo>") != -1)
		{
			var posInicial = texto.indexOf("<campo>");
			var posFinal = texto.indexOf("</campo>");
			var etiqueta = texto.substring(posInicial, posFinal + 8);
			var campo = texto.substring(posInicial + 7, posFinal);
			var dato = registro.fieldToString(campo);
			texto = texto.replace(etiqueta, dato);
		};
		
		// Procesamos el texto buscando etiquetas html &lt;campo&gt;idCampo&lt;/campo&gt;
		while (texto.indexOf("&lt;campo&gt;") != -1)
		{
			var posInicial = texto.indexOf("&lt;campo&gt;");
			var posFinal = texto.indexOf("&lt;/campo&gt;");
			var etiqueta = texto.substring(posInicial, posFinal + 14);
			var campo = texto.substring(posInicial + 13, posFinal);
			var dato = registro.fieldToString(campo);
			texto = texto.replace(etiqueta, dato);
		};
		
		// Dejamos el texto en la variable del proceso para que sea recuperada
		theRoot.setVar("TXT", texto);
	};
};