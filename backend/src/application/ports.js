// Puertos expresados como contratos estructurales; los adaptadores implementan estos métodos.
export const repositoryMethods = {
  users: ['create','findById','findByEmail','list','update','remove'],
  products: ['create','findById','list','update','remove'],
  orders: ['createWithItems','findById','list','updateStatus','remove']
};
