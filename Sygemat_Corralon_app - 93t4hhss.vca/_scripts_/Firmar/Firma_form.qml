import QtQuick 2.6
import QtQuick.Layouts 1.1
import QtQuick.Controls 1.3
import QtQuick.Controls.Styles 1.3

Item
{
	id:root
	width: 250
	height: 250
	
	property int lineWidth: theRoot.varToInt("TAM_LAP")
	property string drawColor: theRoot.varToString("COL_LAP")
	property string backGroundColor: theRoot.varToString("COL_FON")
	property string title: theRoot.varToString("TIT")
	property int capture: theRoot.varToInt("TIP_CAP")
	property bool drawBackground: ( backGroundColor.length > 0)
	
	ColumnLayout
	{
		anchors.fill:parent
		
		Firma_draw
		{
			id: firma
			anchors.fill:container
			lineWidth: root.lineWidth> 0? root.lineWidth: 3
			drawColor: root.drawColor.length?  root.drawColor: "black"
			backGroundColor: root.backGroundColor.length? root.backGroundColor: "white"
		}
	
	Rectangle
		{
		id: container
		color: "transparent"
		anchors
			{
			top: parent.top
			bottom:tool.top
			left:parent.left
			right:parent.right
			leftMargin: 10
			rightMargin:10
			topMargin: 10
			bottomMargin: 10
			}
	
		border.width: 1
		border.color: "#3F51B5"
		radius: 5
		}

		RowLayout 
		{
		id: tool	
		anchors 
			{ 
			left:  parent.left
			right: parent.right
			bottom: parent.bottom 
			leftMargin: 10
			rightMargin: 10
			bottomMargin: 10
			}
	     	Button
				{
					id: clearButton
					text: "Limpiar"
					
					style: ButtonStyle 
						{
							label: Text 
							{
								verticalAlignment: Text.AlignVCenter
								horizontalAlignment: Text.AlignHCenter
								font.family: "Arial"
								font.pointSize: 12
								color: "black"
								text: control.text
							}
							
							background: Rectangle 
							{
								implicitWidth: 100;
								implicitHeight: 30;
								color: "white"
								border.width: control.activeFocus ? 2 : 1;
								border.color: "#CECECE";
								radius: 5;
							}
						}
					onClicked:
					{
						firma.clear() 
					}
				} 
				
			Text {
					id: msjGuardando
					text: "Guardando..."
					visible: false
					anchors.verticalCenter: parent.verticalCenter
					anchors.horizontalCenter: parent.horizontalCenter
					}				
				
	     	Button
				{
					id: saveButton
					text: "Guardar"
					
					style: ButtonStyle 
						{
							label: Text 
							{
								verticalAlignment: Text.AlignVCenter
								horizontalAlignment: Text.AlignHCenter
								font.family: "Arial"
								font.pointSize: 12
								color: "black"
								text: control.text
							}
							
							background: Rectangle 
							{
								implicitWidth: 100;
								implicitHeight: 30;
								color: "white"
								border.width: control.activeFocus ? 2 : 1;
								border.color: "#CECECE";
								radius: 5;
							}
						}
				onClicked: 
					{
					saveButton.visible = false;
					clearButton.visible = false;
					msjGuardando.visible = true;
					var file= theApp.clientCachePath() + "firma.png";
					var mimeType = "image/png"
					switch ( root.capture)
						{
							case 1: 
								{
									theRoot.setVar("FIR_BAS_64", firma.toDataURL(mimeType));
								}
								break;
							
							case 2: 
								{
									firma.save( file );
								}
								break;
							
							case 3: 
								{
									theRoot.setVar("FIR_BAS_64", firma.toDataURL(mimeType ));
									firma.save( file );
								}
								break;
							
							default:
									theRoot.setVar("FIR_BAS_64", firma.toDataURL(mimeType));
									firma.save( file );	
						}
					theRoot.setVar("ACEPTAR",1);
					theMainWindow.currentView().centralWidget().startTimer(2000);
					}
				}
		}
	}
}