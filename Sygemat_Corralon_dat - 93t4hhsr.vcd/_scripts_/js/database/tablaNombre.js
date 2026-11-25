// Devuelve el nombre singular de una tabla a partir de su idRef
var idRef = theRoot.varToString("TAB_ID_REF");
var registro = new VRegister(theRoot);
registro.setTable(idRef);
theRoot.setVar("TAB_NOM", registro.tableInfo().singleName());
