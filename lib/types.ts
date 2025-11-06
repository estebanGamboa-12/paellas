export type Paella = {
  id: string;
  status: "pendiente" | "devuelta";
  servings: number;
  clients: {
    first_name: string;
    last_name: string;
  }[]; // ← AQUÍ: es array, no objeto
};
