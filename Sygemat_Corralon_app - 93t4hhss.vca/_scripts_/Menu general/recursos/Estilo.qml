// Estilo.qml - Estilo común

import QtQuick 2.15
import QtQuick.Window 2.15

Item {
    id : estilo

    // Sistema operativo (wasm, macos, windows, linux, ios, android)
    property string so : Qt.platform.os
    property bool esMovil : es_Movil()
    property bool esTableta : es_Tableta()
    property bool esEscritorio : es_Escritorio()
    property bool esWeb : es_Web()
    property bool vertical : esVertical()
    property bool horizontal : esHorizontal()
    property int anchoPantalla : anchoDePantalla()
    property int altoPantalla : altoDePantalla()
    property real pixelRatio : devicePixelRatio()

    // Fuentes
    FontMetrics {
        id : fuenteSistema
    }

    property string fuenteFamilia : "Arial"
    property int fuentePeso : Font.Medium
    property string fuenteMono : "Courier"
    property int fuenteSizeXXS : fontSizeXXS() //10 W8
	property int fuenteSizeXS : fontSizeXS()   //12 W10
	property int fuenteSizeS : fontSizeS()     //14 W12
    property int fuenteSizeM : fontSizeM()     //16 W14
    property int fuenteSizeL : fontSizeL()     //18 W16
    property int fuenteSizeXXXL : fontSizeXXXL()

    // Colores
    property color colorTransparente : "transparent"
	
	property color colorBlancoBase : colorBasico_Blanco()
	property color colorNegroBase : color_Negro()
	
	property color colorGris100 : colorGris_100()
	property color colorGris80 : colorGris_80()
	property color colorGris60 : colorGris_60()
	property color colorGris40 : colorGris_40()
	property color colorGris30 : colorGris_30()
	property color colorGris20 : colorGris_20()
	
	property color colorNaranjaPrincipal : colorNaranja_Principal()
    property color colorNaranja80 : colorNaranja_80()
	property color colorNaranja60 : colorNaranja_60()
	property color colorNaranja40 : colorNaranja_40()
	property color colorNaranja20 : colorNaranja_20()
	
	property color colorAzulPrincipal : colorAzul_Secundario()
    property color colorAzul80 : colorAzul_80()
	property color colorAzul60 : colorAzul_60()
	property color colorAzul40 : colorAzul_40()
	property color colorAzul20 : colorAzul_20()
	
	property color colorOcre100 : colorOcre_100()
    property color colorOcre80 : colorOcre_80()
	property color colorOcre60 : colorOcre_60()
	property color colorOcre40 : colorOcre_40()
	property color colorOcre20 : colorOcre_20()	
	
	property color colorBGNivel1 : colorBG_Nivel_1()
	property color colorBGNivel2 : colorBG_Nivel_2()
	property color colorBGNivel3 : colorBG_Nivel_3()
	property color colorBGAnaliticos : colorBG_Analiticos()
	
	property color colorVerde	: colorVerde_1()
	property color colorAmarillo2	: colorAmarillo_2()
	property color colorRojo	: colorRojo_1()

    property variant opacidadLineaSeleccionada : 0.25

    // Tamaños
    property int unidad : 8

    // //////////////////////////////////////////////////////////////////////////////
    // Funciones de imagen
    //
    function imagen(name) {
        let imgPath = "../../estilos/";
        return Qt.resolvedUrl(imgPath + name + ".svg");
    }

    // //////////////////////////////////////////////////////////////////////////////
    // Funciones de sistema operativo
    //
    function es_Movil() {
        // Small devices (landscape phones, 576px and up)
        // @media (min-width: 576px) { ... }
        return anchoDePantalla() < 992;
    }

    function es_Tableta() {
        // // Medium devices (tablets, 768px and up)
        // @media (min-width: 768px) { ... }
        return anchoDePantalla() >= 768 && (Qt.platform.os === "ios" || Qt.platform.os === "android");
    }

    function es_Escritorio() {
        // // Large devices (desktops, 992px and up)
        // @media (min-width: 992px) { ... }
        return anchoDePantalla() >= 992 && Qt.platform.os !== "ios" && Qt.platform.os !== "android";
    }

    function es_Web() {
        return Qt.platform.os === "wasm";
    }

    function anchoDePantalla() {
        return Screen.desktopAvailableWidth // ¿/ Screen.devicePixelRatio?;
    }

    function altoDePantalla() {
        return Screen.desktopAvailableHeight // ¿/ Screen.devicePixelRatio?;
    }

    function esVertical() {
        return Screen.primaryOrientation === Qt.PortraitOrientation;
    }

    function esHorizontal() {
        return Screen.primaryOrientation === Qt.LandscapeOrientation;
    }

    function devicePixelRatio() {
        return Screen.devicePixelRatio;
    }

    // //////////////////////////////////////////////////////////////////////////////
    // Funciones de fuentes
    //
	function fontSizeXXS() {
        var size = 10;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }
	
	function fontSizeXS() {
        var size = 12;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }
	
    function fontSizeS() {
        var size = 14;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }

    function fontSizeM() {
        var size = 16;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }

    function fontSizeL() {
        var size = 18;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }

    function fontSizeXXXL() {
        var size = 24;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }
        return size;
    }

    function fontSizeMono() {
        var size = 14;
        switch (Qt.platform.os) {
            case "windows": size -= 2;
                break;
            default:
                break;
        }

        return size;
    }

    // //////////////////////////////////////////////////////////////////////////////
    // Funciones de Colores
    //
    property string currentEstilo : "claro" // en el futuro añadir oscuro
	
	function color_Negro() {
        switch (currentEstilo) {
            case "oscuro":
                return "#000000";
                break;
            default:
                return "#000000";
                break;
        }
    }
	
	function colorBG_Nivel_1() {
        switch (currentEstilo) {
            case "oscuro":
                return "#FFFFFF";
                break;
            default:
                return "#FFFFFF";
                break;
        }
    }
	
	function colorBG_Nivel_2() {
        switch (currentEstilo) {
            case "oscuro":
                return "#F4F7FA";
                break;
            default:
                return "#F4F7FA";
                break;
        }
    }
	
	function colorBG_Nivel_3() {
        switch (currentEstilo) {
            case "oscuro":
                return "#E7EAEF";
                break;
            default:
                return "#E7EAEF";
                break;
        }
    }
	
	function colorBG_Analiticos() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fffaf3";
                break;
            default:
                return "#fffaf3";
                break;
        }
    }
	
	function colorBasico_Blanco() {
        switch (currentEstilo) {
            case "oscuro":
                return "#000000";
                break;
            default:
                return "#FFFFFF";
                break;
        }
    }
	
	function colorGris_100() {
        switch (currentEstilo) {
            case "oscuro":
                return "#3A3C3E";
                break;
            default:
                return "#3A3C3E";
                break;
        }
    }
	
    function colorGris_80() {
        switch (currentEstilo) {
            case "oscuro":
                return "#5E6162";
                break;
            default:
                return "#5E6162";
                break;
        }
    }
	function colorGris_60() {
        switch (currentEstilo) {
            case "oscuro":
                return "#65696C";
                break;
            default:
                return "#65696C";
                break;
        }
    }
	function colorGris_40() {
        switch (currentEstilo) {
            case "oscuro":
                return "#71767B";
                break;
            default:
                return "#71767B";
                break;
        }
    }
	function colorGris_30() {
        switch (currentEstilo) {
            case "oscuro":
                return "#CBD0D8";
                break;
            default:
                return "#CBD0D8";
                break;
        }
    }
	function colorGris_20() {
        switch (currentEstilo) {
            case "oscuro":
                return "#E8EEF4";
                break;
            default:
                return "#E8EEF4";
                break;
        }
    }
	
	function colorNaranja_Principal() {
        switch (currentEstilo) {
            case "oscuro":
                return "#ef5526";
                break;
            default:
                return "#ef5526";
                break;
        }
    }
	function colorNaranja_80() {
        switch (currentEstilo) {
            case "oscuro":
                return "#ef6933";
                break;
            default:
                return "#ef6933";
                break;
        }
    }
	function colorNaranja_60() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fdbb84";
                break;
            default:
                return "#fdbb84";
                break;
        }
    }
	function colorNaranja_40() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fee6ce";
                break;
            default:
                return "#fee6ce";
                break;
        }
    }	
	function colorNaranja_20() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fff6f0";
                break;
            default:
                return "#fff6f0";
                break;
        }
    }
	
	function colorAzul_Secundario() {
        switch (currentEstilo) {
            case "oscuro":
                return "#0078b2";
                break;
            default:
                return "#0078b2";
                break;
        }
    }
	
	function colorAzul_80() {
        switch (currentEstilo) {
            case "oscuro":
                return "#3b8dc3";
                break;
            default:
                return "#3b8dc3";
                break;
        }
    }
	function colorAzul_60() {
        switch (currentEstilo) {
            case "oscuro":
                return "#8ab0d7";
                break;
            default:
                return "#8ab0d7";
                break;
        }
    }
	function colorAzul_40() {
        switch (currentEstilo) {
            case "oscuro":
                return "#c2dbff";
                break;
            default:
                return "#c2dbff";
                break;
        }
    }
	function colorAzul_20() {
        switch (currentEstilo) {
            case "oscuro":
                return "#f2f5fb";
                break;
            default:
                return "#f2f5fb";
                break;
        }
    }
	
	
	function colorOcre_100() {
        switch (currentEstilo) {
            case "oscuro":
                return "#c58d47";
                break;
            default:
                return "#c58d47";
                break;
        }
    }
	
	function colorOcre_80() {
        switch (currentEstilo) {
            case "oscuro":
                return "#d8aa69";
                break;
            default:
                return "#d8aa69";
                break;
        }
    }
	function colorOcre_60() {
        switch (currentEstilo) {
            case "oscuro":
                return "#e5c69b";
                break;
            default:
                return "#e5c69b";
                break;
        }
    }
	function colorOcre_40() {
        switch (currentEstilo) {
            case "oscuro":
                return "#f2e2cd";
                break;
            default:
                return "#f2e2cd";
                break;
        }
    }
	function colorOcre_20() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fcf8f3";
                break;
            default:
                return "#fcf8f3";
                break;
        }
    }
	
	function colorVerde_1() {
        switch (currentEstilo) {
            case "oscuro":
                return "#00a94e";
                break;
            default:
                return "#00a94e";
                break;
        }
    }
	
	function colorVerde_2() {
        switch (currentEstilo) {
            case "oscuro":
                return "#0ac862";
                break;
            default:
                return "#0ac862";
                break;
        }
    }
	
	function colorRojo_1() {
        switch (currentEstilo) {
            case "oscuro":
                return "#ce220b";
                break;
            default:
                return "#ce220b";
                break;
        }
    }
	function colorAmarillo_1() {
        switch (currentEstilo) {
            case "oscuro":
                return "#ffc700";
                break;
            default:
                return "#ffc700";
                break;
        }
    }
	function colorAmarillo_2() {
        switch (currentEstilo) {
            case "oscuro":
                return "#fad44a";
                break;
            default:
                return "#fad44a";
                break;
        }
    }
	
	
    
	
    
} // estilo
