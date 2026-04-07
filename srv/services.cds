using {sap.capire.incidents as my} from '../db/schema'; //Namespace del schema con alias y de donde se importa las entidades

/**
 * Service used by support personell, i.e. the incidents' 'processors'.
 */
service ProcessorService {
    entity Incidents as projection on my.Incidents;

    @readonly
    entity Customers as projection on my.Customers; //Solo lectura para Customers, no se pueden modificar desde este servicio
}

annotate ProcessorService.Incidents with @odata.draft.enabled : true; //Habilita el modo draft para la entidad Incidents en el servicio ProcessorService

/**
 * Service used by administrators to manage customers and incidents.
 */
service AdminService {
    entity Customers as projection on my.Customers;
    entity Incidents as projection on my.Incidents;
}


//Se separan por servicios, uno para los procesadores de incidentes y otro para los administradores, con diferentes niveles de acceso a las entidades.