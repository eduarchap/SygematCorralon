// Ejecutar script

var funcionEjeScr = new Function(theRoot.varToString("SCR"));
var resultado = funcionEjeScr();
theRoot.setVar("RES", resultado);