const DIRECCION_DE_LA_LIBRERIA = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
const HUELLA_DE_LA_LIBRERIA = "sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw";

let cargaDeLaLibreria = null;

function cargarLibreria() {
  if (window.XLSX) {
    return Promise.resolve(window.XLSX);
  }
  if (cargaDeLaLibreria === null) {
    cargaDeLaLibreria = new Promise((resolver, rechazar) => {
      const script = document.createElement("script");
      script.src = DIRECCION_DE_LA_LIBRERIA;
      script.integrity = HUELLA_DE_LA_LIBRERIA;
      script.crossOrigin = "anonymous";
      script.onload = () => resolver(window.XLSX);
      script.onerror = () => {
        cargaDeLaLibreria = null;
        script.remove();
        rechazar(new Error("No se pudo cargar la herramienta de Excel. Revisa tu conexión a Internet."));
      };
      document.head.appendChild(script);
    });
  }
  return cargaDeLaLibreria;
}

export async function descargarLibroDeExcel(nombreDelArchivo, hojas) {
  const XLSX = await cargarLibreria();
  const libro = XLSX.utils.book_new();
  hojas.forEach((hoja) => {
    const hojaDeCalculo = XLSX.utils.aoa_to_sheet(hoja.filas);
    hojaDeCalculo["!cols"] = hoja.anchos.map((ancho) => ({ wch: ancho }));
    XLSX.utils.book_append_sheet(libro, hojaDeCalculo, hoja.nombre);
  });
  XLSX.writeFile(libro, nombreDelArchivo);
}
