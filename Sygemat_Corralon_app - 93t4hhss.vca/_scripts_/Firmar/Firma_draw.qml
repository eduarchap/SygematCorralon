import QtQuick 2.6

Canvas 
{
        id: canvas

        property real lastX
        property real lastY
        property int lineWidth: 3
        property string drawColor: "black"
	    property string backGroundColor: "white"
	    property bool init: false
	    property bool background_on: false
	
	    anchors.fill:parent
        
	    onPaint: 
		{ 
			
			var ctx = getContext('2d')
			
			if( init===false )
			{
				background( ctx );
				background_on= true;
			}
				          
            ctx.lineWidth   = lineWidth
            ctx.strokeStyle = drawColor
            ctx.beginPath()
            ctx.moveTo(lastX, lastY)
            lastX = mouse_area.mouseX
            lastY = mouse_area.mouseY
            ctx.lineTo(lastX, lastY)
            ctx.stroke()
        }
        
		MouseArea 
		{
            id: mouse_area
            anchors.fill: parent
			onClicked: drawPoint()
            onPressed: 
			{
                canvas.lastX = mouseX
                canvas.lastY = mouseY
            }
            onPositionChanged: 
			{
                canvas.requestPaint()
            }
			 
        }
   
	function drawPoint() 
	{
        var ctx = canvas.getContext("2d")

        ctx.lineWidth = lineWidth
        ctx.fillStyle = drawColor
        ctx.fillRect(mouse_area.mouseX, mouse_area.mouseY, lineWidth, lineWidth);
        canvas.requestPaint()
	}
	
	function clear() 
	{
        var ctx = canvas.getContext("2d")
        if( background_on)
			{
				background( ctx );
			}
		else
			{
			ctx.clearRect(0, 0, width, height);
			}
		canvas.requestPaint();
    }
	
	function background( ctx )
	{

        ctx.lineWidth = lineWidth
        ctx.fillStyle = backGroundColor
        ctx.fillRect(0, 0, width, height);
        canvas.requestPaint()
		init= true;
	}
}

