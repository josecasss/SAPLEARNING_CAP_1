const cds = require('@sap/cds') //Siempre se debe importar el módulo de CDS para crear servicios en SAP CAP.

class ProcessorService extends cds.ApplicationService { //La clase ProcessorService extiende de cds.ApplicationService, lo que permite definir un servicio personalizado en SAP CAP.
  /** Registering custom event handlers */
  async init() { //Init registra los handlers personalizados para eventos específicos. 
    this.before("UPDATE", "Incidents", (req) => this.onUpdate(req)); // this.before(<EVENTO>, <ENTIDAD>, <HANDLER>)
    this.before("CREATE", "Incidents", (req) => this.changeUrgencyDueToSubject(req.data));
    this.on('READ', 'Customers', (req, next) => this.onCustomerRead(req, next));
    this.on(['CREATE', 'UPDATE'], 'Incidents', (req, next) => this.onCustomerCache(req, next));
    this.S4bupa = await cds.connect.to('API_BUSINESS_PARTNER');
    this.remoteService = await cds.connect.to('RemoteService');
    return super.init();
  }

  async onCustomerCache(req, next) {
    const { Customers } = this.entities;
    const newCustomerId = req.data.customer_ID;
    const result = await next();
    const { BusinessPartner } = this.remoteService.entities;
    if (newCustomerId && newCustomerId !== "") {
      console.log('>> CREATE or UPDATE customer!');

      // Expands are required as the runtime does not support path expressions for remote services
      const customer = await this.S4bupa.run(SELECT.one(BusinessPartner, bp => {
        bp('*');
        bp.addresses(address => {
          address('addressId');
          address.email(emails => {
            emails('email')
          });
          address.phoneNumber(phoneNumber => {
            phoneNumber('phone')
          })
        })
      }).where({ ID: newCustomerId }));

      if (customer) {
        customer.email = customer.addresses[0]?.email[0]?.email;
        customer.phone = customer.addresses[0]?.phoneNumber[0]?.phone;
        delete customer.addresses;
        delete customer.name;
        await UPSERT.into(Customers).entries(customer);
      }
    }
    return result;
  }

  async onCustomerRead(req, next) {
    console.log('>> delegating to S4 service...', req.query);

    const hasIncidentsExpand = req.query?.SELECT?.columns?.some(col => {
      return Array.isArray(col?.ref) && col.ref[0] === 'incidents' && Array.isArray(col?.expand);
    });

    // Let CAP handle local expand to incidents, because this relationship is local to our service model.
    if (hasIncidentsExpand) return next();

    let { limit, one } = req.query.SELECT
    if (!limit) limit = { rows: { val: 55 }, offset: { val: 0 } } //default limit to 55 rows

    const { BusinessPartner } = this.remoteService.entities;
    const query = SELECT.from(BusinessPartner, bp => {
      bp('*');
      bp.addresses(address => {
        address('addressId');
        address.email(emails => {
          emails('email');
        });
      });
    }).limit(limit)

    if (one) {
      // support for single entity read
      query.where({ ID: req.data.ID });
    }
    // Expands are required as the runtime does not support path expressions for remote services
    let result;
    try {
      result = await this.S4bupa.run(query);
    } catch (error) {
      req.warn(`Remote customer read failed (${error.message}). Falling back to local Customers.`);
      return next();
    }

    result = result.map((bp) => ({
      ID: bp.ID,
      name: bp.name,
      email: (bp.addresses[0]?.email[0]?.email || ''),
      firstName: bp.firstName,
      lastName: bp.lastName,
    }));

    // Explicitly set $count so the values show up in the value help in the UI
    result.$count = 1000;
    console.log("after result", result);
    return result;
  }
  changeUrgencyDueToSubject(data) {
    let urgent = data.title?.match(/urgent/i) // Si el título contiene la palabra "urgent" , se establece el código de urgencia a 'H'. y el ? Permite que pueda venir nulo sin romper el codigo
    if (urgent) data.urgency_code = 'H' // Si el título no contiene "urgent", se establece el código de urgencia a 'M'.
  }

  /** Custom Validation */
  async onUpdate(req) {
    let closed = await SELECT.one(1).from(req.subject).where`status.code = 'C'` // Se realiza una consulta para verificar si el incidente que se está actualizando tiene un estado de cerrado (status.code = 'C').
    if (closed) req.reject`Can't modify a closed incident!`  // Si el incidente está cerrado (status.code = 'C'), se rechaza la actualización con un mensaje de error.
  }
}
module.exports = { ProcessorService } //Finalmente, se exporta la clase ProcessorService para que pueda ser utilizada en otras partes de la aplicación.

// CAP SQL Query:
// SELECT 1
// FROM incidente_objetivo
// WHERE status_code = 'C'