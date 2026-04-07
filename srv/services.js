const cds = require('@sap/cds') //Siempre se debe importar el módulo de CDS para crear servicios en SAP CAP.

class ProcessorService extends cds.ApplicationService { //La clase ProcessorService extiende de cds.ApplicationService, lo que permite definir un servicio personalizado en SAP CAP.
  /** Registering custom event handlers */
  init() { //Init registra los handlers personalizados para eventos específicos. 
    this.before("UPDATE", "Incidents", (req) => this.onUpdate(req)); // this.before(<EVENTO>, <ENTIDAD>, <HANDLER>)
    this.before("CREATE", "Incidents", (req) => this.changeUrgencyDueToSubject(req.data));

    return super.init();
  }

  changeUrgencyDueToSubject(data) {
    let urgent = data.title?.match(/urgent/i) // Si el título contiene la palabra "urgent" , se establece el código de urgencia a 'H'. y el ? Permite que pueda venir nulo sin romper el codigo
    if (urgent) data.urgency_code = 'H' // Si el título no contiene "urgent", se establece el código de urgencia a 'M'.
  }

  /** Custom Validation */
  async onUpdate (req) {
    let closed = await SELECT.one(1) .from (req.subject) .where `status.code = 'C'` // Se realiza una consulta para verificar si el incidente que se está actualizando tiene un estado de cerrado (status.code = 'C').
    if (closed) req.reject `Can't modify a closed incident!`  // Si el incidente está cerrado (status.code = 'C'), se rechaza la actualización con un mensaje de error.
  }
}
module.exports = { ProcessorService } //Finalmente, se exporta la clase ProcessorService para que pueda ser utilizada en otras partes de la aplicación.

// CAP SQL Query:
// SELECT 1
// FROM incidente_objetivo
// WHERE status_code = 'C'