// Ejemplo de Mapa y GPS

import QtQuick 2.6
import QtQuick.Controls 1.4
import QtPositioning 5.6
import QtLocation 5.6

import "componentes"
import "componentes/Auxiliares.js" as Aux

Rectangle
{
    id: container
	width: 1024
	height: 768
    color: "transparent"

	// GPS
    PositionSource
	{
        id: positionSource
		
		preferredPositioningMethods: PositionSource.AllPositioningMethods
		updateInterval: 1000 // Intervalo de refresco
		active: true
		
		property double lastTime: 0 
			
		 onPositionChanged:
		 {
		 	if ( positionSource.position.timestamp.getTime() - lastTime >= 5000 )
		 	{
				lastTime = positionSource.position.timestamp.getTime();
				theRoot.setVar("LONGITUD", positionSource.position.coordinate.longitude );
				theRoot.setVar("LATITUD", positionSource.position.coordinate.latitude );
				theRoot.setVar("ALTITUD", positionSource.position.coordinate.altitude );
		 	}
		 }
    } // Cierre GPS
	
	// Si detectamos que no hay geoposicionamiento, utilizamos las coordenadas del fichero nmealog.txt
	Component.onCompleted:
	{
		if ( positionSource.supportedPositioningMethods === PositionSource.NoPositioningMethods )
		{
			positionSource.nmeaSource = "recursos/nmealog.txt";
			origenValor.text = "Fichero";
		}
	}
	
	// Mapa con el plugin "osm" 
	Plugin
	{
		id: mapPlugin
		name: "osm"
		locales: ["es_ES","en_US", "en_AU", "en_EN"]
		required.mapping: Plugin.AnyMappingFeatures
	}		
	
	//Empieza el Mapa
	Map
	{
		id: mapaQml
		
		plugin: mapPlugin
		anchors.fill: parent
		gesture.enabled: true
		
		zoomLevel: ( maximumZoomLevel - minimumZoomLevel ) * slider.value	
		
		onZoomLevelChanged:
		{
			slider.value = zoomLevel / ( maximumZoomLevel - minimumZoomLevel );
		}

		center: positionSource.position.coordinate
		
		Behavior on center
		{
			CoordinateAnimation
			{
				duration: mapaQml.ready ? 1000 : 0
				easing.type: Easing.InOutQuad
			}
		}

		// Punto que marca el centro del mapa
		MapCircle
		{
			id: circulo
			
			center
			{
				latitude: positionSource.position.coordinate.latitude
				longitude: positionSource.position.coordinate.longitude
				altitude: positionSource.position.coordinate.altitude
			}
			
			radius: 5
			color: "green"
			border.width: 1
			opacity: .7
		}

		

		Component.onCompleted:
		{
			// Configuramos el slider
			slider.value = 0.89;
		}
} 
	
	// Zoom
	Slider
	{
		id: slider
				
		maximumValue: 0.995
		minimumValue: 0.05
		
		orientation: Qt.Vertical
		
		height: 300
		
		anchors.top: parent.top
		anchors.topMargin: 20
		anchors.right: parent.right
	}	
	
	// Información en pantalla
	Rectangle
	{
		id: fondoInformacion
		
		width: locationGrid.width + 10
		height: locationGrid.height + 10
		anchors.top: parent.top
		opacity: .7
	}
		
	Grid
	{
		id: locationGrid

		columns: 2
		spacing: 5
		anchors.left: parent.left
		anchors.leftMargin: 5
		anchors.top: parent.top
		anchors.topMargin: 5
 
		Text
		{		
			text: "Longitud:"
			font.bold: true;
		}
 
		Text
		{
			id: longitudeValue
			text: Aux.printCoordenadas( positionSource.position.coordinate.longitude, 0 );
		}
		
		Text
		{
			text: "Latitud:"
			font.bold: true
		}

		Text
		{
			id: latitudeValue
			text: Aux.printCoordenadas( positionSource.position.coordinate.latitude, 1 );
		}
		
		Text
		{		
			text: "Altitud:"
			font.bold: true
		}
		
		Text
		{
			id: altitudValue
			text: isNaN( positionSource.position.coordinate.altitude ) ? "No disponible" : "" + Math.round( positionSource.position.coordinate.altitude ) + "m";
		}

		Text
		{
			text: "Precisión:"
			font.bold: true
		}
		
		Text
		{
			id: precisionValor
			text: isNaN( positionSource.position.horizontalAccuracy ) ? "No disponible" : "" + Math.round( positionSource.position.horizontalAccuracy ) + "m"
		}

		Text
		{
			text: "Velocidad:"
			font.bold: true
		}
		
		Text
		{
			id: velocidadValor
			text: isNaN( positionSource.position.speed ) ? "No disponible" : "" + Math.round( positionSource.position.speed * 3.6 ) + "km/h"
		}
		
		Text
		{
			id: origenEtiqueta
			text: qsTr( "Origen:" )
			font.bold: true
		}		
		
		Text
		{
			id: origenValor	
			text: Aux.metodoNombre( positionSource.supportedPositioningMethods )	
		}	

		
		Text
		{
			id: tipoMapaEtiqueta
			text: qsTr( "Tipo de mapa:" )
			font.bold: true
		}
	
		ComboBox
		{		
			id: tipoMapaCombo
			
			model: mapaQml.supportedMapTypes
			textRole:"description"
			width: 200		
			
			onCurrentIndexChanged:
			{
				mapaQml.activeMapType = mapaQml.supportedMapTypes[currentIndex]
			}
		}
		
		
	} //Cierre Grid
} //Cierre Rectángulo