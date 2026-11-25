// Cambiar el título del formulario aplicando el nombre del formulario al texto del control
theRoot.dataView().control("TXT_TIT").setText(theRoot.dataView().objectInfo().name());
var tst = theRoot.dataView().control("TXT_TIT_TST")
if(tst !== null){
theRoot.dataView().control("TXT_TIT_TST").setText(theRoot.dataView().objectInfo().name());
}
