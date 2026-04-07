using {sap.capire.incidents as my} from '../db/schema'; //Namespace del schema con alias y de donde se importa las entidades

/**
 * Service used by support personell, i.e. the incidents' 'processors'.
 */
service ProcessorService {
    entity Incidents as projection on my.Incidents;

    @readonly
    entity Customers as projection on my.Customers; //Solo lectura para Customers, no se pueden modificar desde este servicio
}

annotate ProcessorService.Incidents with @odata.draft.enabled; 
annotate ProcessorService with @(requires: 'support'); //Solo los usuarios con el rol 'support' pueden acceder a este servicio, que es para los procesadores de incidentes.
/**
 * Service used by administrators to manage customers and incidents.
 */
service AdminService {
    entity Customers as projection on my.Customers;
    entity Incidents as projection on my.Incidents;
}

annotate AdminService with @(requires: 'admin'); //Solo los usuarios con el rol 'admin' pueden acceder a este servicio
//Se separan por servicios, uno para los procesadores de incidentes y otro para los administradores, con diferentes niveles de acceso a las entidades.