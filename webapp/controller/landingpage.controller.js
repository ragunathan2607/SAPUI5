sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(Controller) {
	"use strict";

	return Controller.extend("portalnew.controller.landingpage", {
onlogin: function()
{
	var route = sap.ui.core.UIComponent.getRouterFor(this);
	route.navTo("loginpage");
},
onshopfloor:  function()
{
	var route2 = sap.ui.core.UIComponent.getRouterFor(this);
	route2.navTo("shopfloor_login");
},
onehsm  :  function()
{
	var route3 = sap.ui.core.UIComponent.getRouterFor(this);
	route3.navTo("EHSMlogin");
},
onquality  :  function()
{
	var route4 = sap.ui.core.UIComponent.getRouterFor(this);
	route4.navTo("qualitylogin");
}
	});
});