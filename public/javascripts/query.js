"use strict";
var sparqlEndpoint = "http://ec2-52-210-17-160.eu-west-1.compute.amazonaws.com:8080/health_services/query";
var defaultLimit = 10;
var institute = "\"Hospital\"";
var queryPrefix = "?query=";
var responseFormat = "&format=json";
var txUrl = null;

try {
    var selectSimple = $('.js-select-simple');

    selectSimple.each(function() {
        var that = $(this);
        var selectBox = that.find('select');
        var selectDropdown = that.find('.select-dropdown');
        selectBox.select2({
            dropdownParent: selectDropdown
        });
    });

} catch (err) {
    console.log(err);
}

var change_label = function(){
    document.getElementById("option_val").value = "";
    if(document.getElementById("nearpredicate").value == "Me"){
            document.getElementById("option").innerHTML  = "Range:";
            document.getElementById("option_val").placeholder = "Default : 1000 m²";
        }
       else if(document.getElementById("nearpredicate").value == "Coordinates"){
            document.getElementById("option").innerHTML  = "Position:";
            document.getElementById("option_val").placeholder = "Enter in Irish coordinate system and range in m² (easting, northing, range)";
        }
        else if(document.getElementById("nearpredicate").value == "Coordinates"){
            document.getElementById("option").innerHTML  = "Position:";
            document.getElementById("option_val").placeholder = "Enter in Irish coordinate system and range in m² (easting, northing, range)";
        }
        else {
            document.getElementById("option").innerHTML  = "Where:";
            document.getElementById("option_val").placeholder = "City, region or specific health institute";
        }
    return true;
}

var getAutocompletionsArrayFromCsv = function(csvString) {
    var completionsArray = [];
    csvString.replace(/=|(--)+|  +|\"/g, "").split("\n").slice(3, -2).forEach(function(url) { //remove first line, as this one contains the projection variable
        completionsArray.push(url.substring(1, url.length - 1)); //remove quotes
    });
    return completionsArray;
}

var getlist = function(property) {
    property = property.replace(/ +/g, "");
    var queryStr = "PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nPREFIX ihsl:<https://www.scss.tcd.ie/~kamblea/ontologies/2019/10/ireland-health-service-locator#>\nPREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\nPREFIX lfn: <http://www.dotnetrdf.org/leviathan#>\nPREFIX osi: <http://ontologies.geohive.ie/osi>\n" +
        "SELECT DISTINCT ?" + property + " WHERE {\n" + "?entity vcard:Address ?address_uri .\n"
    var addressPredicate = "?address_uri ihsl:fullAddress ?" + property + "\n"
    var streetPredicate = "?address_uri ihsl:onStreet ?street_uri .\n?street_uri ihsl:streetName ?" + property + "\n"
    var countyPredicate = ". ?county_uri foaf:name ?" + property + "\n"
    var instituteNamePredicate = "?entity ihsl:serviceName ?" + property + "\n"

    var predicate = (function(prop) {
        switch (prop) {
            case "name":
                return instituteNamePredicate + "}";
            case "County":
                return streetPredicate + countyPredicate + "}";
            case "Street":
                return addressPredicate + streetPredicate + "}";
            case "Area":
                return addressPredicate + "}";
            default:
                return instituteNamePredicate + "}";
        }
    })(property);

    var cb = function(data) {
        //console.log(data);
        var input = document.getElementById("option_val");
        var awesomplete = new Awesomplete(input);
        awesomplete.list = getAutocompletionsArrayFromCsv(data);
        return data;
    }
    console.log("Query: " + queryStr + predicate);
    var listUrl = sparqlEndpoint + queryPrefix + encodeURIComponent(queryStr + predicate) + "&format=text";
    console.log(listUrl)
    $.ajax({
        url: listUrl,
        type: 'GET',
        success: function(res) {
            cb(res)
        }
    });
}


/*$(document).click(function() {
    var el = document.documentElement,
      rfs = el.requestFullscreen
        || el.webkitRequestFullScreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen 
    ;

    rfs.call(el);
})*/

$(document).ready(function() {
    $(window).resize();
    $(".yasr").hide();
    $("#close").hide();

    $('.tab-list__link').on('click', function() {
        var active_tab = $(tab)[0];
        institute = (function(tab) {
            switch (tab) {
                case 1:
                    return "\"Hospital\"";
                case 2:
                    return "\"Healthcenters\"";
                case 3:
                    return "\"NursingHome\"";
                case 4:
                    return "\"Dental\"";
                case 5:
                    return "\"Pharmacy\"";
                case 6:
                    return "?any"
                default:
                    return "\"Hospital\"";
            }
        })(active_tab);
        console.log("Query intended for " + institute);

    });

    $("#close").click(function() {
        $(".yasr").hide();
        $("#close").hide();
    });


    var searchQuery = function() {
        $(".yasr").show();
        $("#close").show();

        console.log('call received!');
        var locationPredicate = document.getElementById("locationpredicate").value;
        var nearPredicate = document.getElementById("nearpredicate").value;
        var whereObject = document.getElementById("option_val").value;

        console.log("locationPredicate = " + locationPredicate + ", nearPredicate = " + nearPredicate + ", whereObject = " + whereObject);
        var queryStr = "";
        var prefixStr = "PREFIX vcard: <http://www.w3.org/2006/vcard/ns#>\nPREFIX foaf: <http://xmlns.com/foaf/0.1/>\nPREFIX ihsl:<https://www.scss.tcd.ie/~kamblea/ontologies/2019/10/ireland-health-service-locator#>\nPREFIX xsd: <http://www.w3.org/2001/XMLSchema#>\nPREFIX lfn: <http://www.dotnetrdf.org/leviathan#>\nPREFIX osi: <http://ontologies.geohive.ie/osi>\n"
        if (nearPredicate == "Any" && locationPredicate == "All Ireland") {
            queryStr = prefixStr +
                "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                    "?entity ihsl:type " + institute + " .\n" +
                    "?entity ihsl:serviceName ?name .\n" +
                    "?entity vcard:Address ?address_uri .\n" +
                    "?address_uri ihsl:fullAddress ?address .\n" + 
                    "?address_uri ihsl:onStreet ?street_uri .\n" + 
                    "?street_uri ihsl:streetName ?street .\n" + 
                    "?street_uri osi:County ?county_uri .\n" + 
                    "?county_uri foaf:name ?county }\n" +
                    "LIMIT " + defaultLimit;
        }
        else if (nearPredicate == "Me") {
            var distance = document.getElementById("option_val").value || 1000;
            queryStr = prefixStr + 
            "SELECT DISTINCT ?name ?address ?street ?county (ROUND(?dist) AS ?distance) ?easting ?northing  WHERE {\n" +
                "?entity ihsl:type " + institute + "  .\n" +
                "?entity ihsl:serviceName ?name .\n" +
                "?entity vcard:Address ?address_uri .\n" +
                "?address_uri ihsl:fullAddress ?address .\n" + 
                "?address_uri ihsl:onStreet ?street_uri .\n" + 
                "?street_uri ihsl:streetName ?street .\n" + 
                "?street_uri osi:County ?county_uri .\n" + 
                "?county_uri foaf:name ?county .\n" +
                "?entity ihsl:Coordinates ?coordinate_uri .\n" +
                "?coordinate_uri ihsl:x ?easting . \n" +
                "?coordinate_uri ihsl:y ?northing .\n" +
                "BIND (lfn:sqrt(lfn:pow( " + easting +  " - xsd:float(?easting), 2) + lfn:pow( " + northing + " - xsd:float(?northing), 2)) AS ?dist) .\n" +
                "FILTER ( ?dist < " + distance + " )}\n" +
                "LIMIT " + defaultLimit; 
        }
        else if (nearPredicate == "Coordinates") {
            var coordinates = (document.getElementById("option_val").value).split(",");
            if(coordinates.length < 2) {
                coordinates = [315194.4,231849.3,10000];
            }
            var e_cord = parseFloat(coordinates[0]).toFixed(1);
            var n_cord = parseFloat(coordinates[1]).toFixed(1);
            var distance = parseFloat(coordinates[2]).toFixed(1);
            queryStr = prefixStr + 
            "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                "?entity ihsl:type " + institute + "  .\n" +
                "?entity ihsl:serviceName ?name .\n" +
                "?entity vcard:Address ?address_uri .\n" +
                "?address_uri ihsl:fullAddress ?address .\n" + 
                "?address_uri ihsl:onStreet ?street_uri .\n" + 
                "?street_uri ihsl:streetName ?street .\n" + 
                "?street_uri osi:County ?county_uri .\n" + 
                "?county_uri foaf:name ?county .\n" +
                "?entity ihsl:Coordinates ?coordinate_uri .\n" +
                "?coordinate_uri ihsl:x ?easting . \n" +
                "?coordinate_uri ihsl:y ?northing .\n" +
                "BIND (lfn:sqrt(lfn:pow( " + e_cord +  " - xsd:float(?easting), 2) + lfn:pow( " + n_cord + " - xsd:float(?northing), 2)) AS ?distance) .\n" +
                "FILTER ( ?distance < " + distance + " )}\n" +
                "LIMIT " + defaultLimit; 
        }
        else if ((nearPredicate != "Me" || nearPredicate == "Coordinates" ) && locationPredicate == "All Ireland") {
            queryStr = prefixStr +
                "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                    "{ select ?street ?county where {\n" +
                    "?ientity ihsl:type \"" + nearPredicate + "\" .\n" +
                    "?ientity ihsl:serviceName \"" + whereObject + "\" .\n" +
                    "?ientity vcard:Address ?iaddress_uri .\n" +
                    "?iaddress_uri ihsl:onStreet ?street_uri .\n" +
                    "?street_uri ihsl:streetName ?street .\n" +
                    "?street_uri osi:County ?county_uri .\n" +
                    "?county_uri foaf:name ?county \n" +
                "}} \n" +
                    "?entity ihsl:type " + institute + " .\n" +
                    "?entity ihsl:serviceName ?name .\n" +
                    "?entity vcard:Address ?address_uri .\n" +
                    "?address_uri ihsl:fullAddress ?address .\n" + 
                    "?address_uri ihsl:onStreet ?street_uri .\n" + 
                    "?street_uri ihsl:streetName ?street .\n" + 
                    "?street_uri osi:County ?county_uri .\n" + 
                    "?county_uri foaf:name ?county }\n" +
                    "LIMIT " + defaultLimit;
        }
        else if ((nearPredicate != "Me" || nearPredicate != "Coordinates" ) && locationPredicate == "All") {
            queryStr = prefixStr +
                "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                    "{ select ?street ?county where {\n" +
                    "?ientity ihsl:type \"" + nearPredicate + "\" .\n" +
                    "?ientity ihsl:serviceName \"" + whereObject + "\" .\n" +
                    "?ientity vcard:Address ?iaddress_uri .\n" +
                    "?iaddress_uri ihsl:onStreet ?street_uri .\n" +
                    "?street_uri ihsl:streetName ?street .\n" +
                    "?street_uri osi:County ?county_uri .\n" +
                    "?county_uri foaf:name \"" + locationPredicate + "\" .\n" +
                "}} \n" +
                    "?entity ihsl:type " + institute + " .\n" +
                    "?entity ihsl:serviceName ?name .\n" +
                    "?entity vcard:Address ?address_uri .\n" +
                    "?address_uri ihsl:fullAddress ?address .\n" + 
                    "?address_uri ihsl:onStreet ?street_uri .\n" + 
                    "?street_uri ihsl:streetName ?street .\n" + 
                    "?street_uri osi:County ?county_uri .\n" + 
                    "?county_uri foaf:name ?county }\n" +
                    "LIMIT " + defaultLimit;
        }

        else if (locationPredicate == "County") {
            queryStr = prefixStr +
                "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                    "?entity ihsl:type " + institute + " .\n" +
                    "?entity ihsl:serviceName ?name .\n" +
                    "?entity vcard:Address ?address_uri .\n" +
                    "?address_uri ihsl:fullAddress ?address .\n" + 
                    "?address_uri ihsl:onStreet ?street_uri .\n" + 
                    "?street_uri ihsl:streetName ?street .\n" + 
                    "?street_uri osi:County ?county_uri .\n" + 
                    "?county_uri foaf:name ?county .\n" +
                    "FILTER(?county = \"" + whereObject + "\") }" + 
                    "LIMIT " + defaultLimit;
        }
        else if (locationPredicate == "Street") {
            queryStr = prefixStr +
                "SELECT DISTINCT ?name ?address ?street ?county WHERE {\n" +
                    "?entity ihsl:type " + institute + " .\n" +
                    "?entity ihsl:serviceName ?name .\n" +
                    "?entity vcard:Address ?address_uri .\n" +
                    "?address_uri ihsl:fullAddress ?address .\n" + 
                    "?address_uri ihsl:onStreet ?street_uri .\n" + 
                    "?street_uri ihsl:streetName ?street .\n" + 
                    "?street_uri osi:County ?county_uri .\n" + 
                    "?county_uri foaf:name ?county .\n" +
                    "FILTER(?street = \"" + whereObject + "\") }" + 
                    "LIMIT " + defaultLimit;
        }
        console.log("Query: " + queryStr);
        yasqe.setValue(queryStr );
        txUrl = sparqlEndpoint + queryPrefix + encodeURIComponent(queryStr) + responseFormat;
        console.log("GET Request: " + txUrl);

        var cb = function(data) {
            //console.log(JSON.stringify(data))

        }
        $.ajax({
            url: txUrl,
            type: 'GET',
            success: function(res) {
                cb(res)
                yasr.setResponse({
                    response: res,
                    contentType: "application/json"
                });
            }
        });
    }
    $("#submit").click(searchQuery);
})