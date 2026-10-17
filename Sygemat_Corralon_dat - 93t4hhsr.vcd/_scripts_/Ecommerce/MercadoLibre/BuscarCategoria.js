#include "(CurrentProject)/Ecommerce/MercadoLibre.js"

importClass("XMLHttpRequest");

var Idcategoria		=  theRoot.varToString("ID_CAT");


var resultado = BuscarCategoriaID(Idcategoria);


theRoot.setVar("NOM_CAT", resultado.name);
theRoot.setVar("MIN_PRE", resultado.settings.minimum_price);







