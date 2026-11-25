// Qml para firmar en un lienzo vacío (canvas) a mano alzada.
import QtQuick 2.4
import QtQuick.Controls 1.3
import QtQuick.Controls.Styles 1.3
import QtQuick.Layouts 1.1

Item {
	id: root;
	anchors.fill: parent;
	anchors.margins: 10;

	// Controles superiores para elegir color y grosor del lápiz
	RowLayout {
		id: tool_bar
		GroupBox {
			title: "Color";
			Layout.alignment: Qt.AlignBottom;
			RowLayout {
				Loader {
					sourceComponent: sel_color;
				}
				Loader {
					sourceComponent: sel_color;
					onLoaded: item.color = "MediumBlue";
				}
				Loader {
					sourceComponent: sel_color;
					onLoaded: item.color = "DarkRed";
				}
				Loader {
					sourceComponent: sel_color;
					onLoaded: item.color = "DarkOliveGreen";
				}
			}
		}
		GroupBox {
			title: "Grosor";
			Layout.alignment: Qt.AlignBottom;
			Slider {
				id: grosor;
				minimumValue: 1;
				maximumValue: 5;
				stepSize: 0.5;
				tickmarksEnabled: true;
				updateValueWhileDragging: false;
				value: firma.grosor;
				onValueChanged: firma.grosor = value;
			}
		}
		// Botones para Limpiar, Guardar y Cerrar
		GroupBox {
			Layout.fillWidth: true
			Layout.alignment: Qt.AlignBottom | Qt.AlignRight
			RowLayout {
				Loader {
					id: btn_limpiar;
					sourceComponent: boton;
					onLoaded: item.text = "Limpiar";
				}
				Loader {
					id: btn_guardar;
					sourceComponent: boton;
					onLoaded: item.text = "Guardar";
				}
                // Desactivamos el botón cerrar al estar incluido en un subformulario
				//Loader {
				//	id: btn_cerrar;
				//	sourceComponent: boton;
				//	onLoaded: item.text = "Cerrar";
				//}
			}
		}
	}

	Rectangle {
		id: marco;
		width: 350;
		height: 280;
		anchors.top: tool_bar.bottom
		anchors.topMargin: 2;
		color: "GhostWhite"
		border.width: 2
		border.color: "#3F51B5"
		
		Canvas {
			id: firma;
			anchors.fill: parent;
			anchors.margins: 5;
			property bool abajo: false;
			property real lastX;
			property real lastY;
			property color color: "black";
			property real grosor: 2;
			onPaint: {
				if (firma.abajo) {
					var ctx = getContext('2d');
					ctx.lineWidth = firma.grosor;
					ctx.strokeStyle = firma.color;
					ctx.beginPath();
					ctx.moveTo(lastX, lastY);
					lastX = mouse_area.mouseX;
					lastY = mouse_area.mouseY;
					ctx.lineTo(lastX, lastY);
					ctx.stroke();
				}
			}
			MouseArea {
				id: mouse_area;
				anchors.fill: parent;
				cursorShape: Qt.CrossCursor;
				onPressed: {
					firma.abajo = true;
					firma.lastX = mouseX;
					firma.lastY = mouseY;
				}
				onPositionChanged: {
					firma.requestPaint();
				}
			}
		}
	}

	Component {
		id: sel_color;
		Rectangle {
			width: 20;
			height: 20;
			color: "black";
			MouseArea {
				anchors.fill: parent;
				cursorShape: Qt.PointingHandCursor;
				onPressed: {
					firma.color = parent.color;
				}
			}
		}
	}
	Component {
		id: boton;
		Button {
			text: "botón";
			style: ButtonStyle {
				background: Rectangle {
					implicitWidth: 120;
					implicitHeight: 30;
					color: "white"
					border.width: control.activeFocus ? 2 : 1;
					border.color: "#3F51B5";
					radius: 4;
					}
			}
			onClicked: {
						// Tipo de captura: 1 base64, 2 imagen, 3 ambos ( base64 e imagen)
						if (text == btn_guardar.item.text) 
						{	
							theRoot.setVar("ACEPTAR", "1")
						// Ejecutamos el proceso que lee la firma y la inserta an la BBDD
							theRoot.RunProcess( "93t4hhss.vca@IMP_FIR" );
							//bool RunProcess
							var senda = theApp.clientCachePath() + "firma.png";
							if (firma.grabToImage(function(result) {result.saveToFile( senda );} )) 
							theRoot.RunProcess( "93t4hhss.vca@IMP_FIR" );
							{			
							}
						} 
						else borrarFirma()
						}
		}
	}

	function borrarFirma() {
		var ctx = firma.getContext('2d');
		ctx.reset();
		ctx.beginPath();
		ctx.rect(0, 0, firma.width, firma.height);
		ctx.fillStyle = 'white';
		ctx.fill();
		firma.requestPaint();
	}

	Component.onCompleted: {
		borrarFirma();
	}
}