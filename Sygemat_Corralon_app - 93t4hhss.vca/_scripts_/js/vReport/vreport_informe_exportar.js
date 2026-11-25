#include "(CurrentProject)/js/vReport/vReportFicheros.js"

// -----------------------------------------------------------------------
// Exportamos la definición del informe en formato XML a disco
// -----------------------------------------------------------------------
var senda = theApp.clientCachePath() + theRegisterIn.fieldToString("ID") + ".xml";
var ok = vReportFicheros.escribirXml(theRegisterIn.fieldToString("DFN"), senda);