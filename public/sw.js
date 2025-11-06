self.addEventListener("install", () => {
  console.log("SW instalado");
});

self.addEventListener("fetch", () => {
  // Aquí luego añadimos offline si quieres
});
