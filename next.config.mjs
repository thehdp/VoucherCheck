/** @type {import('next').NextConfig} */
const nextConfig = {
  // Paquetes con binarios/workers: no se empaquetan, se cargan desde node_modules
  serverExternalPackages: ["unpdf", "sharp", "tesseract.js", "tesseract.js-core"],
  // El idioma del OCR y el motor wasm tienen que viajar con la función de Vercel
  outputFileTracingIncludes: {
    "/api/leer": ["./ocr/**/*", "./node_modules/tesseract.js-core/**/*", "./node_modules/tesseract.js/src/**/*"],
  },
};
nextConfig.headers = async () => [
  { source: "/(.*)", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "X-Lector-Version", value: "1.1" }] },
];
export default nextConfig;
