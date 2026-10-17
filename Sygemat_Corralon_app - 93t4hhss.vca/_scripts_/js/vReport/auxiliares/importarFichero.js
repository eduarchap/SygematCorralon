#include "(CurrentProject)/js/vReport/vReportFicheros.js"

// Importamos el informe en formato xml de disco

// Inicializamos variables
var strSendaFichero = theRoot.varToString( "INF_XML" );

// Devolvemos el resultado de llamar a la función
theRoot.setVar( "INF_DFN", vReportFicheros.leerXml( strSendaFichero ));