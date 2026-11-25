importClass("XMLHttpRequest");

var numerocheque = theRoot.varToString("NUMEROCHEQUE");
var numeropedido = theRoot.varToString("NUMEROPEDIDO");



var obj = new Object();
   obj.numerocheque = numerocheque;
   obj.numeropedido = numeropedido;
   
var data = JSON.stringify(obj);


var xhr = new XMLHttpRequest();
xhr.timeout=15000;
xhr.open("POST", "https://hook.us1.make.com/us1rjn2ve0cqws3tbxn673klsk9vqs2b", true);
xhr.setRequestHeader('Accept', '*/*');
//xhr.setRequestHeader('User-Agent', 'SygematREST');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(data);

while(xhr.readyState != 4) {
    xhr.processEvents();
}

if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
	
	 theRoot.setVar("RET" ,JSON.stringify(xhr.response));
	
}