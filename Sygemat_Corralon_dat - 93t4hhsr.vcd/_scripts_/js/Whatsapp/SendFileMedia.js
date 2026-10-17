importClass("XMLHttpRequest");

// WARNING: For POST requests, body is set to null by browsers.
var data = new FormData();
var rutaArchivo = theRoot.varToString("RUT");
data.append("messaging_product", "whatsapp");
data.append("file", fileInput.files[0], rutaArchivo);
 
var xhr = new XMLHttpRequest();
xhr.withCredentials = true;


xhr.open("POST", "https://graph.facebook.com/v15.0/100855602945379/media");
xhr.setRequestHeader("Authorization", "Bearer EAAM6z2XEJAwBAMZBNL624O4yF7UjRt5J4gDmFEvtldj1jHU6uHvnW1lgxi0cjdsiL5uTpOqf0rDBDjP666d7enRqFAsWyoaQkBiKlILteCU5kjXuPRDo0703a4SBcEZAitzNYLccmvzfRVM5qH9N4ZAZBNxidYdNbHn5g5ZBXa6m7LJPyOuIK");

xhr.send(data);

while(xhr.readyState != 4) {
    xhr.processEvents();
	
}

if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
    var oJson = JSON.parse(xhr.responseText);
	theRoot.setVar("OK" , 1);
	theRoot.setVar("RES" , oJson);
}