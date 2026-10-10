#include "(CurrentProject)/Importar y exportar/utils.js"


// Obtenemos la rejilla activa
var rejilla = getActiveListControl();

var lista = new VRegisterList(rejilla.root());
rejilla.getList(lista);

var data = lista.saveToData();
theRoot.setVar("DATA" , data.compress(9).toBase64().toLatin1String());