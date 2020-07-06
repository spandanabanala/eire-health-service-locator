# Éire Health Service Locator

[![WIDOCO](https://img.shields.io/badge/documentation-on%20WIDOCO-orange)](https://www.scss.tcd.ie/~kamblea/ontologies/2019/10/ireland-health-service-locator/1.0.0/myDocumentation/index-en.html)

Links of open dataset used:

1. https://data.gov.ie/dataset/list-of-pharmacies-in-ireland
2. https://data.gov.ie/dataset/list-of-nursing-homes-in-ireland
3. https://data.gov.ie/dataset/list-of-hospitals-in-ireland
4. https://data.gov.ie/dataset/list-of-dental-practices-in-ireland
5. https://data.gov.ie/dataset/list-of-health-centres-in-ireland
6. https://data.gov.ie/dataset/dublin-city-roads-and-streets
 
## UI Features
* The dataset (Turtle files) are hosted on Apache Jena persistent triplet database and the SPARQL queries are served by a Fuseki REST endpoint both running on an AWS micro instances.

* The Front-end is a NodeJS application which allows users to build SPARQL queries with a minimalistic and intuitive UI.
Users could search for a Health Institution from (Hospitals / Health service centre / Nursing Home / Dental clinic / Pharmacy) based on its location. Each institution is on a different Tab as shown below.

* UI has provision to specify two types of near predicate.
  * First is based on location, a dropdown is provided for the user to select a location-based filter from (All Ireland / County / Area / Street). The location filter could be used for queries like "All Health Centre in Dublin" or "List all Health Institutions near Redmond's Hill street".

  * The second location-based predicate is proximity based. The dropdown has options like (Me / Coordinate / Hospital / Health service centre / Nursing Home / Dental clinic / Pharmacy). This Filter could be used for queries like "List all Health Centre near me", this uses the browsers location and the distance specified in the Range text input (Defaulted to 1000 sq meters) to generate a spatial query. The users could also use this filter to search for health institutions near another one like for example, "List all Nursing Home near Park Pharmacy".

* While using the filters, if the user has to type a complete address or name of any institution, an autofill feature is included for better user experience and to avoid typos.

* UI integrates YASR to display the query results. It also provides users with a YASQE query editor under the SPARQL tab for advanced users to run custom queries.

* The Stats tab can be used for aggregate queries and display results in a graphical representation using google charts.

## Usage
1) Install the required modules
Install [Node.js and nodemon](http://nodejs.org).

2) Add some Turtle/RDF data. 
For this we use a docker image of Apache Jena Fuseki Server(https://hub.docker.com/r/stain/jena-fuseki) running on a AWS EC2 instance. The Data sets available in the /turtle directories are created bu uplifting CSV data from various Opendata websites using JUMA see: https://www.scss.tcd.ie/~crottija/juma/. These are loaded into a persistent triplet store Jena TDB see: http://jena.apache.org/index.html
Upload a .ttl file, sample added to project.

3) Edit the SPARQLD endpoint in index.ejs and query.js

4) CD to app folder. To start the app, run these commands

    $ npm install
    
    $ nodemon app.js

Finally, point your browser to
[http://localhost:4000/](http://localhost:4000/).
