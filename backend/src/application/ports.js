// Puertos expresados como contratos estructurales; los adaptadores implementan estos métodos.
export const repositoryMethods = {
  users: ['create','findById','findByEmail','list','update','remove'],
  products: ['create','findById','list','update','remove'],
  orders: ['createWithItems','findById','list','updateStatus','remove']
};

// Puerto de salida: el caso de uso notifica una orden sin conocer SMTP ni Nodemailer.
export const emailServicePortMethods = ['orderCreated'];
// Alias de compatibilidad para consumidores existentes.
export const notificationPortMethods = emailServicePortMethods;
