#include "(CurrentProject)/js/Whatsapp/Whatsapp.js"

var rutaAdjunto = theRoot.varToString("SND_FIC");

var idFicheroSubido = subirAdjunto(rutaAdjunto);
theRoot.setVar("ID", idFicheroSubido);
