importClass("XMLHttpRequest");

const xhr = new XMLHttpRequest();
xhr.withCredentials = true;

var bin = theRoot.varToString("BIN");


xhr.open("GET", "https://api.bintable.com/v1/"+bin+"?api_key=a727a7d78c38bedf078c38a584b1832d38fce23a");
xhr.setRequestHeader("x-rapidapi-key", "f64e0fa1cfmsh15ae635beda7c8cp16ecd8jsn6d05f6a265b5");
xhr.setRequestHeader("x-rapidapi-host", "bin-lookup3.p.rapidapi.com");

xhr.send();

while(xhr.readyState != 4) {
    xhr.processEvents();
}


if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
	var oJson = JSON.parse(xhr.responseText);
    theRoot.setVar("RET" ,JSON.stringify(oJson));
}
