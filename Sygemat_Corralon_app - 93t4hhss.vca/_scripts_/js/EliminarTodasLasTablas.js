// Cargamos la tabla TAB_GEN
var listaTablas = new VRegisterList(theRoot);
listaTablas.setTable("sygemat_corralon_dat/TAB_GEN");
listaTablas.load("IDE", []);

// Recorremos cada registro
for (var i = 0; i < listaTablas.size(); i++) {
    var registro = listaTablas.readAt(i);
    var nombreTabla = registro.fieldToString("IDE");
	if(nombreTabla != "sygemat_corralon_dat/TAB_GEN"){
		theApp.emptyTable(nombreTabla);
	}
   
}