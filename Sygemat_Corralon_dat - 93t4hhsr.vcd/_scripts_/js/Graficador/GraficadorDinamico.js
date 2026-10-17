
//Obtenemos los valores
var fechaCalculo       = "";
var fechaDesdeCalculo  = "";
var fechaHastaCalculo  = "";
var valoresAdicionales = "";

if( theRoot.varToBool("PID_FCH") ){
	fechaCalculo = theRoot.varToDate("FCH");
}
if( theRoot.varToBool("PID_RGO_FCH") ){
	fechaDesdeCalculo = theRoot.varToDate("FCH_DSD");
	fechaHastaCalculo = theRoot.varToDate("FCH_HST");
}

valoresAdicionales = theRoot.varToString("VAL_ADC");

// Instanciamos y ejecutamos la función dinámica
var funcionDash = new Function(theRoot.varToString("JS_SCR"));
var resultado = funcionDash();
theRoot.setVar("RES", resultado);