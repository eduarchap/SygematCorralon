#include "(CurrentProject)/vTools/db/velneoDB.js"


filtrar = new Array();
filtrar.adjustControls=adjustControls;



// Carga el combobox de condiciones en función al tipo de campo
//  y oculta o muestra controles en función al tipo de campo
function adjustControls(dataView, fieldInfo) {
	var cbCondicion = dataView.control("CONDICION");
	var cbCampoCompleto = dataView.control("CMP_COMPLETO");
	var cbCompararFichaSeleccionada = dataView.control("CMP_FICHA_SEL");
	var cbDistinguirMayusMinus = dataView.control("CMP_DIST_MAYUS_MINUS");
	
	// Ocultamos los controles donde se introduce el valor
	dataView.control("VALOR_STRING").hide();
	dataView.control("VALOR_MAESTRO").hide();
	dataView.control("VALOR_NUMERICO").hide();
	dataView.control("VALOR_FECHA").hide();
	dataView.control("VALOR_HORA").hide();
	dataView.control("VALOR_TIEMPO").hide();
	dataView.control("VALOR_BOOL").hide();
	
	dataView.control("TXT_SEL").hide();
	// Por defecto visible
	dataView.control("TXT_DATO_A_BUSCAR").show();
	// Por defecto deshabilitado
	cbDistinguirMayusMinus.setDisabled(true);
	
	cbCompararFichaSeleccionada.setEnabled(true);
	
	cbCondicion.clear();
	// El campo seleccionado es de tipo maestro
	if ((fieldInfo.bindType==VTableInfo.BindTypeMaster) || (fieldInfo.bindType==VTableInfo.BindTypeStatic)) {
		cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
		cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
		var oTexto = theRoot.varToString("LISTA");
		var listaTexto = new VByteArray();
		listaTexto.setText(oTexto);
		listaTexto.fromBase64(listaTexto);
		var lista = new VRegisterList(theRoot);
		if (lista.loadFromData(listaTexto)) {
			valoresUnicos = velneoDB.listaValoresUnicosCampo(lista, fieldInfo.id);
			cbValorMaestro = dataView.control("VALOR_MAESTRO");
			cbValorMaestro.clear();
			for (var i=0; i<valoresUnicos.length; i++) 
				cbValorMaestro.addItem(valoresUnicos[i].split("|")[0], valoresUnicos[i].split("|")[1]);
			cbValorMaestro.show();
			// Deshabilitamos campo completo y comparar con ficha seleccionada ya que en este caso no tienen sentido
			cbCampoCompleto.setDisabled(true);
			cbCompararFichaSeleccionada.setDisabled(true);
			// Ajustamos la etiquetas usadas en el campo de búsqueda
			dataView.control("TXT_DATO_A_BUSCAR").hide();
			dataView.control("TXT_SEL").show();
		}
	}
	else {
		// El campo seleccionado es de tipo numérico
		if ((fieldInfo.type == VTableInfo.FieldTypeNumeric) || (fieldInfo.type == VTableInfo.FieldTypeFormulaNumeric)) {
			cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
			cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
			cbCondicion.addItem(tr("sygemat_corralon_app/MEN_QUE"), "<");
			cbCondicion.addItem(tr("sygemat_corralon_app/MAY_QUE"), ">");			
			// Mostramos controles
			dataView.control("VALOR_NUMERICO").show();
			cbCampoCompleto.setDisabled(true);
		}
		// El campo seleccionado es de tipo cadena	
		if ((fieldInfo.type<=VTableInfo.FieldTypeAlphaUtf16) || (fieldInfo.type==VTableInfo.FieldTypeFormulaAlfa)) {
			cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
			cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
			// Mostramos controles
			dataView.control("VALOR_STRING").show();
			cbCampoCompleto.setEnabled(true);
			cbDistinguirMayusMinus.setEnabled(true);
		}		
		// El campo seleccionado es de tipo fecha
		if ((fieldInfo.type==VTableInfo.FieldTypeDate) || (fieldInfo.type == VTableInfo.FieldTypeFormulaDate)) {
			cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
			cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
			cbCondicion.addItem(tr("sygemat_corralon_app/MEN_QUE"), "<");
			cbCondicion.addItem(tr("sygemat_corralon_app/MAY_QUE"), ">");
			// Mostramos controles
			dataView.control("VALOR_FECHA").show();
			cbCampoCompleto.setDisabled(true);
		}
		// El campo seleccionado es de tipo hora
		if (fieldInfo.type==VTableInfo.FieldTypeTime) {
			cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
			cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
			cbCondicion.addItem(tr("sygemat_corralon_app/MEN_QUE"), "<");
			cbCondicion.addItem(tr("sygemat_corralon_app/MAY_QUE"), ">");
			// Mostramos controles
			dataView.control("VALOR_HORA").show();
			cbCampoCompleto.setDisabled(true);
		}
		// El campo seleccionado es de tipo tiempo
		if ((fieldInfo.type==VTableInfo.FieldTypeDateTime) || (fieldInfo.type == VTableInfo.FieldTypeFormulaDateTime)) {
			cbCondicion.addItem(tr("sygemat_corralon_app/IGU_A"), "=");
			cbCondicion.addItem(tr("sygemat_corralon_app/DIST_DE"), "!");
			cbCondicion.addItem(tr("sygemat_corralon_app/MEN_QUE"), "<");
			cbCondicion.addItem(tr("sygemat_corralon_app/MAY_QUE"), ">");
			// Mostramos controles
			dataView.control("VALOR_TIEMPO").show();
			cbCampoCompleto.setDisabled(true);
		}		
		// El campo seleccionado es de tipo bool
		if (fieldInfo.type==VTableInfo.FieldTypeBool) {
			cbCondicion.addItem("Es", "=");
			dataView.control("VALOR_BOOL").addItem(tr("sygemat_corralon_app/NO"));
			dataView.control("VALOR_BOOL").addItem(tr("sygemat_corralon_app/SI"));
			// Mostramos controles
			dataView.control("VALOR_BOOL").show();
			cbCampoCompleto.setDisabled(true);
		}
	}
}
