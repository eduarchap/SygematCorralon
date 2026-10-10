import QtQuick 2.15

import "menuAuxiliares.js" as Aux
import "recursos"

Rectangle{
	id: marco;
	width: 100;
	height: 100;
		
	property var nombreVisible: theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM")
	
	color: estilo.colorBGNivel2
		
	Estilo {
        id : estilo
    } // Estilo
	
	ListModel
	{
		id: modeloElementos
	}// Lista de elementos	

	property var aElementosMenuGeneral: []
	property var aElementosMenuVisible: []
	property var gruposUsuarios: []
	property var nContador: 0
	property var menuVisible: "GEN"
	property var menuTest: false //ver menu test
	property var reducido: theRoot.varToString("RED")
	
	
	
	ListView{
		id: menuArboladoOculto
		x: 0
        y: 0
        width: 1
        height: 1
		
		objectName: "theListView";
		model: theListModel;
		
		delegate: 
			Rectangle{
				id: elementoOculto;				
				height: 1
                width: 1  
				Component.onCompleted: {
					let elemento = {};
					elemento.visible = false;
					elemento.decoracion = decoration;
					elemento.texto = display;
					elemento.codigo = codigo;
					elemento.longitud = longitud;
					elemento.desplegado = false;
					elemento.agrupador = false;
					elemento.esTest = esTest;
					elemento.tipo = tipo;
					elemento.objetoEjecutar = objetoEjecutar;
					elemento.todosGrupos = todosGrupos;
					elemento.gruposAutorizados = gruposAutorizados;					
					elemento.registro = theListModel.GetItem(nContador);
					elemento.iconoBase = imagenPrincipal					
					elemento.iconoSeleccionado = imagenSegundaria				
					elemento.esOpcionModulo = esOpcionModulo;
					elemento.colorModulo = colorModulo;
					aElementosMenuGeneral[nContador] = elemento;
					nContador = nContador + 1;					
					//Aux.arrayToModelo(aElementosMenuGeneral, modeloElementos);
					Aux.arrayToModeloVisible(aElementosMenuGeneral, modeloElementos, menuVisible, menuTest, gruposUsuarios);
					if( theListModel.Count() == nContador){
						nContador = 0;
					}
				}
			}
	}
	
	ListView {
		id: menuArbolado
		width: parent.width
		//height: parent.height
		anchors.bottom: cajaMesaAyuda.top;
		anchors.bottomMargin: 136;
		
		anchors.fill: parent		
		focus: true;
		
		model: modeloElementos	
		
		delegate: 
			Rectangle{
				id: elemento;
				width: menuArbolado.width;
				height: (model.esOpcionModulo == "1" ? estilo.unidad * 7: (model.agrupador == true ? estilo.unidad * 5: estilo.unidad * 3.5));
				property var desplegado: false
				property var onHover: false
				//color: model.esOpcionModulo == "1" ? model.colorModulo: (model.desplegado == true ? estilo.colorNaranja20: model.longitud == "12" ? estilo.colorBGNivel3: estilo.colorBGNivel2)
				color: model.esOpcionModulo == "1" ? model.colorModulo: (model.desplegado == true ? estilo.colorNaranja20: model.longitud == "12" ? (onHover == true ? estilo.colorGris30 : estilo.colorGris20): onHover == true ? estilo.colorGris20 : estilo.colorBGNivel2)
				anchors.topMargin: estilo.unidad;
				anchors.bottomMargin: estilo.unidad ;
				
				Image{ //Icono cuando es un menu que agrupa
					id: iconoElemento
					//source: decoracion
					source: model.iconoBase != "null" ? "data:image/svg+xml;base64," + ((model.desplegado == true) || (onHover == true)? model.iconoSeleccionado:model.iconoBase): "";
					width: estilo.unidad * 3
					height: estilo.unidad * 3
					fillMode: Image.PreserveAspectFit
					anchors.left: parent.left
					anchors.top: parent.top
					anchors.leftMargin: estilo.unidad * 2
					//anchors.topMargin: estilo.unidad * 1.5
					anchors.verticalCenter: parent.verticalCenter					
					visible: codigo.length < 7? true: false;
				}
				Rectangle{ //Icono (rectangulo gris) cuando es una opcion directa de menu
					id: iconoElementoItem
					
					width: estilo.unidad / 2
					height: estilo.unidad * 4
					anchors.left: parent.left
					anchors.top: parent.top
					anchors.verticalCenter: parent.verticalCenter
					anchors.leftMargin: estilo.unidad * 2 * ( model.longitud == "12" ? 2 : 1)
					anchors.topMargin: estilo.unidad / 8
					anchors.bottomMargin: estilo.unidad / 8
					color: onHover == false ? ((model.longitud == "12") ? estilo.colorBlancoBase: estilo.colorGris30) : estilo.colorNaranjaPrincipal;
					visible: (model.agrupador == false) && (codigo.length > 6) ? true:false;
				}
				Image{ //Flechita cuando es un sub-menu que agrupa (izquierda)
					id: iconoFlechitaIzquierda
					source: model.desplegado == true? "recursos/iconoMenuDesplegado.svg" : (onHover == true? "recursos/iconoMenuContraidoHover.svg" : "recursos/iconoMenuContraido.svg")
					width: model.desplegado == true? estilo.unidad * 2: estilo.unidad * 1.1575;
					height: model.desplegado == true? estilo.unidad * 1.1575 : estilo.unidad * 2
					fillMode: Image.PreserveAspectFit
					anchors.left: parent.left
					anchors.top: parent.top
					anchors.leftMargin: estilo.unidad * 2
					anchors.verticalCenter: parent.verticalCenter
					//anchors.topMargin: model.desplegado == true? estilo.unidad * 3 : estilo.unidad * 2.25;
					visible: (model.agrupador == true) && (codigo.length > 6) ? true:false;
				}
				
				Text{ //Texto de la opcion
					id: textoElemento
					//text: codigo + "-" + texto
					text: model.texto 
					clip: true
					height: parent.height
					elide: Text.ElideRight					
					//color: model.esOpcionModulo == "1" ? estilo.colorBlancoBase: ((onHover == true) || (model.desplegado == true)? estilo.colorNaranja80: estilo.colorGris100)
					color: model.esOpcionModulo == "1" ? estilo.colorBlancoBase: (model.desplegado == true ? estilo.colorNaranja80 : estilo.colorGris100)
					horizontalAlignment: Text.AlignHCenter
					verticalAlignment: Text.AlignVCenter
					anchors.verticalCenter: parent.verticalCenter
					anchors.left: model.codigo.length < 7 ? iconoElemento.right: iconoElementoItem.right;
					anchors.leftMargin: estilo.unidad * 2
					font.family : estilo.fuenteFamilia
					font.pixelSize : estilo.fuenteSizeM
					visible: reducido == "1"? false : true
					//font.bold : (onHover == true) || (model.desplegado == true) ? true: false;
					
				}				
				Image{ //Flechita cuando es un menu agrupado (derecha)
					id: iconoFlechita
					source: model.desplegado == true? "recursos/iconoMenuDesplegado.svg" : (onHover == true? "recursos/iconoMenuContraidoHover.svg" : "recursos/iconoMenuContraido.svg")
					//width: model.desplegado == true? estilo.unidad * 2: estilo.unidad * 1.1575;
					height: model.desplegado == true? estilo.unidad : estilo.unidad * 2
					fillMode: Image.PreserveAspectFit
					anchors.right: parent.right
					anchors.top: parent.top
					anchors.rightMargin: estilo.unidad * 2					
					anchors.verticalCenter: parent.verticalCenter
					visible: reducido == "1"? false : ((model.agrupador == true) && (codigo.length < 7) ? true:false)					
				}
				
				MouseArea {//Mouse area del rectangulo completo
					id: mouseAreaGeneral
					anchors.fill: parent					
					hoverEnabled: true
					cursorShape: Qt.PointingHandCursor
					onEntered: {
						onHover = true;
					}
					onExited: {
						onHover = false;
					}
					onClicked:{
						if( reducido != "1" ){
							if( tipo == "C" ){
								menuVisible = objetoEjecutar;
								Aux.arrayToModeloVisible(aElementosMenuGeneral, modeloElementos, menuVisible, menuTest, gruposUsuarios);
							}else if( tipo == "M" ){
								aElementosMenuGeneral = Aux.actualizarDesplegado(aElementosMenuGeneral, codigo, desplegado)
								Aux.arrayToModeloVisible(aElementosMenuGeneral, modeloElementos, menuVisible, menuTest, gruposUsuarios);
								//desplegado = !desplegado;
							}else if( tipo == "A" ){
								theMainWindow.runAction(objetoEjecutar);
							}else if( tipo == "P" ){
								theRoot.runProcess(objetoEjecutar);
							}
						}						
					}
				}
			}			
	}//Fin del ListView
	
	Rectangle{//recuadro de la mesa de ayuda
		id: cajaMesaAyuda
		width: parent.width
		height: estilo.unidad * 3
		anchors.bottom: cajaConfiguracion.top
		//Todo como no tiene top no puedo establecer el topMargin
		anchors.topMargin: estilo.unidad * 3
		color: estilo.colorBGNivel2
		property var onHoverMesaAyuda: false
		
		Image{
			id: iconoMesaAyuda
			source: "recursos/mesaAyuda.svg"
			height: estilo.unidad * 2
			width: estilo.unidad * 2
			fillMode: Image.PreserveAspectFit
			anchors.verticalCenter:parent.verticalCenter
			anchors.left: parent.left
			anchors.leftMargin: estilo.unidad * 3
			
		}
		Text{
			id: textoMesaAyuda
			anchors.verticalCenter: parent.verticalCenter
			anchors.left: iconoMesaAyuda.right
			anchors.leftMargin: estilo.unidad
			text: "Mesa de ayuda"
			font.pixelSize : estilo.fuenteSizeS	
			visible: reducido == "1" ? false : true
			color: estilo.colorGris100;
			//color: onHoverMesaAyuda == true ? estilo.colorNaranjaPrincipal: estilo.colorNegroBase
		}
		MouseArea {//Mouse area del rectangulo de la mesa de ayuda
			id: mouseAreaMesaAyuda
			anchors.fill: parent					
			hoverEnabled: true
			cursorShape: Qt.PointingHandCursor
			onEntered: {
				textoMesaAyuda.color = estilo.colorNaranjaPrincipal
				iconoMesaAyuda.source = "recursos/mesaAyudaNaranja.svg"
			}
			onExited: {
				textoMesaAyuda.color = estilo.colorGris100
				iconoMesaAyuda.source = "recursos/mesaAyuda.svg"
			}
			onClicked:{
				theMainWindow.runAction( "sygemat_corralon_app/MENU_FLOTANTE" );
			}
		}
	}
	
	Rectangle{//recuadro de la configuracion
		id: cajaConfiguracion
		width: parent.width
		height: estilo.unidad * 3
		anchors.bottom: cajaCalidadConexion.top
		color: estilo.colorBGNivel2
		property var onHoverMesaAyuda: false
		Image{
			id: iconoConfiguracion
			source: "recursos/borrar.svg"
			height: estilo.unidad * 2
			width: estilo.unidad * 2
			fillMode: Image.PreserveAspectFit
			anchors.verticalCenter:parent.verticalCenter
			anchors.left: parent.left
			anchors.leftMargin: estilo.unidad * 3
			
		}
		Text{
			id: textoConfiguracion
			anchors.verticalCenter: parent.verticalCenter
			anchors.left: iconoConfiguracion.right
			anchors.leftMargin: estilo.unidad
			text: "Limpiar cache"
			font.pixelSize : estilo.fuenteSizeS	
			visible: reducido == "1" ? false : true
			//color: estilo.colorGris100;
			color: onHoverMesaAyuda == true ? estilo.colorNaranjaPrincipal: estilo.colorNegroBase
		}
		MouseArea {//Mouse area del rectangulo de la configuracion
			id: mouseConfiguracion
			anchors.fill: parent					
			hoverEnabled: true
			cursorShape: Qt.PointingHandCursor
			onEntered: {
				textoConfiguracion.color = estilo.colorNaranjaPrincipal
				iconoConfiguracion.source = "recursos/borrarNaranja.svg"
			}
			onExited: {
				textoConfiguracion.color = estilo.colorGris100
				iconoConfiguracion.source = "recursos/borrar.svg"
			}
			onClicked:{
				theMainWindow.runAction( "sygemat_corralon_app/BOR_CAC_RUN" );
			}
		}
	}
	
	Rectangle{//recuadro de la calidad de la conexion
		id: cajaCalidadConexion		
		width: parent.width
		height: estilo.unidad * 3
		anchors.bottom: recuadroDatos.top
		color: estilo.colorBGNivel2		
		property var onHoverMesaAyuda: false
		anchors.topMargin: estilo.unidad
		
		Timer {
			interval: 500; running: true; repeat: true
			onTriggered: {
				textoCalidadConexion.text = theRoot.calcFormulaVelneo("getConnectionQuality()") == 0 ? "SIN CONEXION" : theRoot.calcFormulaVelneo("getConnectionQuality()") < 3 ? "MALA" : theRoot.calcFormulaVelneo("getConnectionQuality()") == 3 ? "REGULAR" : theRoot.calcFormulaVelneo("getConnectionQuality()") > 3 ? "BUENA" : ""
				textoCalidadConexion.color = (theRoot.calcFormulaVelneo("getConnectionQuality()") < 3 ? estilo.colorRojo : (theRoot.calcFormulaVelneo("getConnectionQuality()") == 3 ? estilo.colorAmarillo2 : (theRoot.calcFormulaVelneo("getConnectionQuality()") > 3 ? estilo.colorVerde : "")))
			}
		}
		Text{
			id: etiquetaCalidadConexion
			text: "Estado internet: "			
			font.family : estilo.fuenteFamilia
			font.pixelSize : estilo.fuenteSizeXS				
			visible: reducido == "1"? false : true	
			anchors.left: parent.left
			anchors.verticalCenter: parent.verticalCenter
			anchors.leftMargin: estilo.unidad * 3
			color: estilo.colorGris100
		}	
		Text {  
			id: textoCalidadConexion			
			font.family : estilo.fuenteFamilia
			font.pixelSize : estilo.fuenteSizeXS
			anchors.top: etiquetaCalidadConexion.top
			anchors.left : etiquetaCalidadConexion.right				
			visible: reducido == "1"? false : true	
			
		}	
	}
	
	Rectangle{ //Recuadro de los datos de empresa/usuario
		id: recuadroDatos
		width: parent.width
		height: estilo.unidad * 8
		color: estilo.colorBGNivel1		
		anchors.leftMargin: estilo.unidad / 8 * 6
		anchors.rightMargin: estilo.unidad / 8 * 6
		//todo: Ver porque no aplica la propiedad de bottom respecto al padre
		anchors.bottom: parent.bottom		
		
		
		Image{
			id: iconoEmpresa
			source: "data:image/png;base64," + Aux.obtenerImagenEmpresa(); 
			fillMode: Image.PreserveAspectFit
			//border.radius: estilo.unidad / 2
			width: estilo.unidad * 4
			height: estilo.unidad * 4
			anchors.verticalCenter: parent.verticalCenter
			anchors.left: parent.left
			anchors.leftMargin: estilo.unidad * 2
		}
		Rectangle{
			id: cajaTextos
			anchors.top: iconoEmpresa.top
			anchors.bottom: iconoEmpresa.bottom
			anchors.left: iconoEmpresa.right
			anchors.right: parent.right
			anchors.leftMargin: estilo.unidad
			visible: reducido == "1"? false : true
			
			Text{
				id: nombreUsuario
				text: theRoot.calcFormulaVelneo("sysUserName");
				font.bold: true
				font.family : estilo.fuenteFamilia
				font.pixelSize : estilo.fuenteSizeS
				anchors.top: parent.top
				anchors.topMargin: estilo.unidad * -0.1
				color: estilo.colorNegroBase
				visible: reducido == "1"? false : true
			}
			Text{
				id: nombreEmpresa
				text: theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM");				
				font.family : estilo.fuenteFamilia
				font.pixelSize : estilo.fuenteSizeS
				anchors.bottom: parent.bottom
				anchors.bottomMargin: estilo.unidad * -0.1
				color: estilo.colorGris80
				visible: reducido == "1"? false : true
				z:1
				
				MouseArea {//Mouse area de la empresa
					id: mouseAreaEmpresa
					anchors.fill: parent					
					hoverEnabled: true
					cursorShape: Qt.PointingHandCursor
					acceptedButtons: Qt.LeftButton
					onClicked:{
						nombreVisible = theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM");
						theMainWindow.runAction( "sygemat_corralon_app/SEL_EMP" );
						timerRefrescoNombreEmpresa.start();	
					}
				}
			}
		
			Image{
				id: iconoSalir
				source: "recursos/salir.svg"
				width: estilo.unidad * 3
				height: estilo.unidad * 3
				anchors.right: parent.right
				anchors.verticalCenter: parent.verticalCenter
				anchors.rightMargin: estilo.unidad
				fillMode: Image.PreserveAspectFit
				z: 1
				visible: reducido == "1"? false : true
				MouseArea {//Mouse area de la imagen de salir
					id: mouseAreaSalir
					anchors.fill: parent
					hoverEnabled: true					
					cursorShape: Qt.PointingHandCursor
					onClicked:{
						theMainWindow.runAction( "sygemat_corralon_app/CRR" );						
					}
				}
				
			}
			Timer {//Timer para el refresco del nombre de la empresa
				id: timerRefrescoNombreEmpresa
				interval: 500; 
				running: false; 
				repeat: true;
				onTriggered: {
					if( nombreVisible != theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM") ){
						nombreEmpresa.text = theApp.globalVarToString("sygemat_corralon_dat/EMP_NOM")
						stop();
					}					
				}
			}
		}		
	}
	
	
	//On complete del elemento principal
	Component.onCompleted:
	{
		gruposUsuarios = Aux.obtenerGruposDelUsuario();
		aElementosMenuGeneral = [];
		modeloElementos.clear;
		nContador = 0;
		menuVisible = "GEN";		
		//modeloElementos = theListModel;
		//aElementosMenuGeneral = Aux.modeloToArray( modeloElementos );
		//theListModel.Clear();
	}//onComplete
}