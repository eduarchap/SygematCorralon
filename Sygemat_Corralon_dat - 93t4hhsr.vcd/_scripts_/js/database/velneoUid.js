// -----------------------------------------------------------------------------------------------------
// Genera un UID (Identificador único) de la longitud y basado en el texto que le pasemos
// -----------------------------------------------------------------------------------------------------

// Preparamos las variables de trabajo a partir de los valores recibidos en las variables locales
var alfabeto = theRoot.varToString("ALF");
var longitud = theRoot.varToInt("LON");

// Generamos el UID
var uid = "";
for (var letra = 0; letra < longitud; letra++) {
	uid += alfabeto.charAt(Math.floor(Math.random() * alfabeto.length));
};

// Retornamos el UID generado en la variable local
theRoot.setVar("UID", uid);
