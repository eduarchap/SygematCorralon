importClass("XMLHttpRequest");

var tipmensaje = theRoot.varToInt("TIPMEN");
var telefono = theRoot.varToString("TLF");
var parametro1 = theRoot.varToString("VARIABLE1");
var parametro2 = theRoot.varToString("VARIABLE2");
var parametro3 = theRoot.varToString("VARIABLE3");
var parametro4 = theRoot.varToString("VARIABLE4");
var id_file= theRoot.varToString("ID_FILE");
var file_name = theRoot.varToString("FILENAME");
var templateName = theRoot.varToString("TEMPLATENAME");


// Enviamos Wp con Media
if(tipmensaje==1){
	var data = JSON.stringify({
	  "messaging_product": "whatsapp",
	  "to": telefono,
	  "type": "template",
	  "template": {
		"name": templateName,
		"language": {
		  "code": "es_AR"
		},
		"components": [
		  {
			"type": "header",
			"parameters": [
			  {
				"type": "document",
				"document": {
				  "filename": file_name,
				  "id": id_file
				}
			  }
			]
		  },
		  {
			"type": "body",
			"parameters": [
			  {
				"type": "text",
				"text": parametro1
			  },
			  {
				"type": "text",
				"text": parametro2
			  },
			  {
				"type": "text",
				"text": parametro3
			  },
			  {
				"type": "text",
				"text": parametro4
			  }
			]
		  }
		]
	  }
	});
    
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;

	xhr.open("POST", "https://graph.facebook.com/v15.0/100855602945379/messages");
	xhr.setRequestHeader("Authorization", "Bearer EAAM6z2XEJAwBACIqGly673fGiSb3BdZCndSghffZAqoF2mmjh3MtCR7vhlcWK5YT8ZCvirOnQovfqPk4jaIHXLfffNXXvWhheZAVXvKySFJVk0TsWuzx6z4jpxflP65qfUQwytl9bjTXP3mslXh744plZAiumfFqFkQZBsLTdoURW7t6eq1egB");
	xhr.setRequestHeader("Content-Type", "application/json");

	xhr.send(data);

	while(xhr.readyState != 4) {
		xhr.processEvents();
		
	}

	if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
		var oJson = JSON.parse(xhr.responseText);
		theRoot.setVar("RES_STATUS" , xhr.status);
	}
}

if(tipmensaje==2){
	var data = JSON.stringify({
	  "messaging_product": "whatsapp",
	  "to": telefono,
	  "type": "template",
	  "template": {
		"name": templateName,
		"language": {
		  "code": "es_AR"
		},
		"components": [
		  {
			"type": "body",
			"parameters": [
			  {
				"type": "text",
				"text": parametro1
			  },
			  {
				"type": "text",
				"text": parametro2
			  },
			  {
				"type": "text",
				"text": parametro3
			  },
			  {
				"type": "text",
				"text": parametro4
			  }
			]
		  }
		]
	  }
	});
	var xhr = new XMLHttpRequest();
	xhr.withCredentials = true;

	xhr.open("POST", "https://graph.facebook.com/v15.0/100855602945379/messages");
	xhr.setRequestHeader("Authorization", "Bearer EAAM6z2XEJAwBACIqGly673fGiSb3BdZCndSghffZAqoF2mmjh3MtCR7vhlcWK5YT8ZCvirOnQovfqPk4jaIHXLfffNXXvWhheZAVXvKySFJVk0TsWuzx6z4jpxflP65qfUQwytl9bjTXP3mslXh744plZAiumfFqFkQZBsLTdoURW7t6eq1egB");
	xhr.setRequestHeader("Content-Type", "application/json");

	xhr.send(data);

	while(xhr.readyState != 4) {
		xhr.processEvents();
		
	}

	if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
		var oJson = JSON.parse(xhr.responseText);
		theRoot.setVar("RES_STATUS" , xhr.status);
	}
}
