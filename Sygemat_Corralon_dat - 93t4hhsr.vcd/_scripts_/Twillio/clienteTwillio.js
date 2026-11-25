importClass("XMLHttpRequest");

var url          = "https://api.twilio.com/2010-04-01/Accounts/"+ theApp.constant("sygemat_corralon_dat/SID") +"/Messages.json"
var destinatario = theRoot.varToString("DST");
var mensaje = theRoot.varToString("MSJ");

var vb = new VByteArray();
vb.setText( theApp.constant("sygemat_corralon_dat/SID") + ":" + theApp.constant("sygemat_corralon_dat/TOK") );

var cuerpo = "Body=" + mensaje + "&From=" + theApp.constant("sygemat_corralon_dat/FROM") + "&To=" + destinatario;

var xhr = new XMLHttpRequest();
xhr.open("POST", url, true);
xhr.setRequestHeader('Authorization', 'Basic ' + vb.toBase64().toLatin1String());
xhr.setRequestHeader('User-Agent', 'SygematClient');
xhr.setRequestHeader('Accept', '*/*');
xhr.setRequestHeader('Accept-Encoding', 'gzip, deflate, br');
xhr.setRequestHeader('Connection', 'keep-alive');
xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
xhr.send( cuerpo );

// Al ser una llamada asíncrona, esperamos a que la petición termine
while(xhr.readyState != 4) { // 4: Done
    xhr.processEvents();
}

var oJson = JSON.parse(xhr.response);

if ( (xhr.errorCode==0) && (xhr.status == 201) ) {
    theRoot.setVar("OK" , 1);
theRoot.setVar("RES" , "Status " + oJson.status );
}else{
theRoot.setVar("OK" , 0);
theRoot.setVar("RES" , "Cod. Error " + oJson.code + "\nDescripcion " + oJson.message );
}