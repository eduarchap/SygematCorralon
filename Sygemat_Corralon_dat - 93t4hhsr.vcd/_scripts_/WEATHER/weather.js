importClass("XMLHttpRequest");

const data = "";
var prov = theRoot.varToString("PROV");
const xhr = new XMLHttpRequest();
xhr.withCredentials = true;


xhr.open("GET", "https://community-open-weather-map.p.rapidapi.com/weather?q="+prov+"&lat=0&lon=0&callback=test&id=2172797&lang=null&units=%22metric%22%20or%20%22imperial%22");
xhr.setRequestHeader("x-rapidapi-key", "ef6de1f577msh4aeae4fadd2d7d7p1155c1jsn4c996adb9513");
xhr.setRequestHeader("x-rapidapi-host", "community-open-weather-map.p.rapidapi.com");
//xhr.setRequestHeader('Content-Type', 'application/json');


xhr.send(data);

  
while(xhr.readyState != 4) {
    xhr.processEvents();
}

if ( (xhr.errorCode ==0) && (xhr.status == 200) ) {
	
	 theRoot.setVar("RET" ,JSON.stringify(xhr.response));
	
}
