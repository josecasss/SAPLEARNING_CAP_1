using {
    cuid,  
    managed,
    sap.common.CodeList
} from '@sap/cds/common';

namespace sap.capire.incidents;

/**
* Incidents created by Customers.
*/
entity Incidents : cuid, managed {
    customer     : Association to Customers;
    title        : String @title: 'Title';
    urgency      : Association to Urgency default 'M';
    status       : Association to Status default 'N';
    conversation : Composition of many {
                       key ID        : UUID;
                           timestamp : type of managed : createdAt;
                           author    : type of managed : createdBy;
                           message   : String;
                   };
}

/**
* Customers entitled to create support Incidents.
*/
entity Customers : managed {
    key ID           : String;
        firstName    : String;
        lastName     : String;
        name         : String = trim(firstName || ' ' || lastName); // Concatenation del primer y segundo nombre
        email        : EMailAddress;
        phone        : PhoneNumber;
        incidents    : Association to many Incidents
                           on incidents.customer = $self;
        creditCardNo : String(16) @assert.format: '^[1-9]\d{15}$'; // Validación de número de tarjeta de crédito (16 dígitos, no comienza con 0) REGEX
        addresses    : Composition of many Addresses
                           on addresses.customer = $self;
}

entity Addresses : cuid, managed {
    customer      : Association to Customers;
    city          : String;
    postCode      : String;
    streetAddress : String;
}

entity Status : CodeList { // Name/Description 
    key code        : String enum { // Como si fuera un Fixed Value en ABAP CLOUD //Enumeracion
            new = 'N';
            assigned = 'A';
            in_process = 'I';
            on_hold = 'H';
            resolved = 'R';
            closed = 'C';
        };
        criticality : Integer;
}

entity Urgency : CodeList {
    key code : String enum {
            high = 'H';
            medium = 'M';
            low = 'L';
        };
}

type EMailAddress : String;
type PhoneNumber  : String;

